const request = require("supertest");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");

const app = require("../src/app");
const prisma = require("../src/config/prisma");

const ADMIN_EMAIL = "atendimentos.admin.teste@teste.com";
const ATENDENTE_A_EMAIL = "atendimentos.atendenteA.teste@teste.com";
const ATENDENTE_B_EMAIL = "atendimentos.atendenteB.teste@teste.com";
const SENHA = "SenhaValida123!";

async function criarUsuario(cargo, email) {
    const senhaHash = await argon2.hash(SENHA);

    return prisma.usuario.create({
        data: {
            nome: `Usuario Teste (${cargo})`,
            email,
            senhaHash,
            cargo,
            ativo: true,
        },
    });
}

function gerarToken(usuario) {
    return jwt.sign(
        {
            sub: String(usuario.id),
            cargo: usuario.cargo,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "15m",
            issuer: "sistema-atendimento",
            audience: "painel-atendimento",
        }
    );
}

async function criarCliente(telefone) {
    return prisma.cliente.create({
        data: { nome: "Cliente Teste Atendimentos", telefone },
    });
}

let admin;
let atendenteA;
let atendenteB;
let tokenAdmin;
let tokenAtendenteA;
let tokenAtendenteB;

beforeEach(async () => {
    await prisma.historicoAtendimento.deleteMany({});
    await prisma.conversa.deleteMany({});
    await prisma.cliente.deleteMany({});
    await prisma.usuario.deleteMany({});

    admin = await criarUsuario("admin", ADMIN_EMAIL);
    atendenteA = await criarUsuario("atendente", ATENDENTE_A_EMAIL);
    atendenteB = await criarUsuario("atendente", ATENDENTE_B_EMAIL);

    tokenAdmin = gerarToken(admin);
    tokenAtendenteA = gerarToken(atendenteA);
    tokenAtendenteB = gerarToken(atendenteB);
});

afterAll(async () => {
    await prisma.historicoAtendimento.deleteMany({});
    await prisma.conversa.deleteMany({});
    await prisma.cliente.deleteMany({});
    await prisma.usuario.deleteMany({});
    await prisma.$disconnect();
});

describe("POST /api/atendimentos (criar)", () => {
    test("atendimento nasce em status aguardando, sem atendente", async () => {
        const cliente = await criarCliente("11911100001");

        const resposta = await request(app)
            .post("/api/atendimentos")
            .set("Authorization", `Bearer ${tokenAtendenteA}`)
            .send({ clienteId: cliente.id });

        expect(resposta.status).toBe(201);
        expect(resposta.body.atendimento.status).toBe("aguardando");
        expect(resposta.body.atendimento.atendente).toBeNull();
    });
});

describe("POST /api/atendimentos/:id/assumir", () => {
    test("atendente consegue assumir um atendimento sem responsavel", async () => {
        const cliente = await criarCliente("11911100002");
        const criado = await prisma.conversa.create({
            data: { clienteId: cliente.id, status: "aguardando" },
        });

        const resposta = await request(app)
            .post(`/api/atendimentos/${criado.id}/assumir`)
            .set("Authorization", `Bearer ${tokenAtendenteA}`);

        expect(resposta.status).toBe(200);
        expect(resposta.body.atendimento.status).toBe("em_atendimento");
        expect(resposta.body.atendimento.atendente.id).toBe(atendenteA.id);
    });

    test("assumir um atendimento que ja tem responsavel retorna 409", async () => {
        const cliente = await criarCliente("11911100003");
        const criado = await prisma.conversa.create({
            data: { clienteId: cliente.id, status: "em_atendimento", atendenteId: atendenteA.id },
        });

        const resposta = await request(app)
            .post(`/api/atendimentos/${criado.id}/assumir`)
            .set("Authorization", `Bearer ${tokenAtendenteB}`);

        expect(resposta.status).toBe(409);

        const inalterado = await prisma.conversa.findUnique({ where: { id: criado.id } });
        expect(inalterado.atendenteId).toBe(atendenteA.id);
    });
});

describe("PATCH /api/atendimentos/:id (transicao de status)", () => {
    test("transicao invalida (aguardando -> resolvido direto) retorna 400", async () => {
        const cliente = await criarCliente("11911100004");
        const criado = await prisma.conversa.create({
            data: { clienteId: cliente.id, status: "aguardando" },
        });

        const resposta = await request(app)
            .patch(`/api/atendimentos/${criado.id}`)
            .set("Authorization", `Bearer ${tokenAtendenteA}`)
            .send({ status: "resolvido" });

        expect(resposta.status).toBe(400);

        const inalterado = await prisma.conversa.findUnique({ where: { id: criado.id } });
        expect(inalterado.status).toBe("aguardando");
    });

    test("transicao valida em sequencia: aguardando -> em_atendimento -> resolvido", async () => {
        const cliente = await criarCliente("11911100005");
        const criado = await prisma.conversa.create({
            data: { clienteId: cliente.id, status: "aguardando" },
        });

        const primeiraTransicao = await request(app)
            .patch(`/api/atendimentos/${criado.id}`)
            .set("Authorization", `Bearer ${tokenAtendenteA}`)
            .send({ status: "em_atendimento" });

        expect(primeiraTransicao.status).toBe(200);
        expect(primeiraTransicao.body.atendimento.status).toBe("em_atendimento");

        const segundaTransicao = await request(app)
            .patch(`/api/atendimentos/${criado.id}`)
            .set("Authorization", `Bearer ${tokenAtendenteA}`)
            .send({ status: "resolvido" });

        expect(segundaTransicao.status).toBe(200);
        expect(segundaTransicao.body.atendimento.status).toBe("resolvido");
    });

    test("atendente que nao e responsavel nao consegue transferir o atendimento para si mesmo (403)", async () => {
        const cliente = await criarCliente("11911100006");
        const criado = await prisma.conversa.create({
            data: { clienteId: cliente.id, status: "em_atendimento", atendenteId: atendenteA.id },
        });

        const resposta = await request(app)
            .patch(`/api/atendimentos/${criado.id}`)
            .set("Authorization", `Bearer ${tokenAtendenteB}`)
            .send({ atendenteId: atendenteB.id });

        expect(resposta.status).toBe(403);

        const inalterado = await prisma.conversa.findUnique({ where: { id: criado.id } });
        expect(inalterado.atendenteId).toBe(atendenteA.id);
    });

    test("admin consegue transferir qualquer atendimento", async () => {
        const cliente = await criarCliente("11911100007");
        const criado = await prisma.conversa.create({
            data: { clienteId: cliente.id, status: "em_atendimento", atendenteId: atendenteA.id },
        });

        const resposta = await request(app)
            .patch(`/api/atendimentos/${criado.id}`)
            .set("Authorization", `Bearer ${tokenAdmin}`)
            .send({ atendenteId: atendenteB.id });

        expect(resposta.status).toBe(200);
        expect(resposta.body.atendimento.atendente.id).toBe(atendenteB.id);

        const atualizado = await prisma.conversa.findUnique({ where: { id: criado.id } });
        expect(atualizado.atendenteId).toBe(atendenteB.id);
    });
});

describe("GET /api/atendimentos (filtro por status)", () => {
    test("filtro por status na listagem funciona", async () => {
        const cliente = await criarCliente("11911100008");

        await prisma.conversa.create({ data: { clienteId: cliente.id, status: "aguardando" } });
        await prisma.conversa.create({ data: { clienteId: cliente.id, status: "aguardando" } });
        await prisma.conversa.create({
            data: { clienteId: cliente.id, status: "em_atendimento", atendenteId: atendenteA.id },
        });

        const resposta = await request(app)
            .get("/api/atendimentos")
            .query({ status: "aguardando" })
            .set("Authorization", `Bearer ${tokenAtendenteA}`);

        expect(resposta.status).toBe(200);
        expect(resposta.body.atendimentos).toHaveLength(2);
        resposta.body.atendimentos.forEach((atendimento) => {
            expect(atendimento.status).toBe("aguardando");
        });
    });
});
