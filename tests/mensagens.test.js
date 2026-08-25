const request = require("supertest");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");

const app = require("../src/app");
const prisma = require("../src/config/prisma");

const ATENDENTE_EMAIL = "mensagens.atendente.teste@teste.com";
const SENHA = "SenhaValida123!";

async function criarUsuarioAutenticado() {
    const senhaHash = await argon2.hash(SENHA);

    return prisma.usuario.create({
        data: {
            nome: "Atendente Teste Mensagens",
            email: ATENDENTE_EMAIL,
            senhaHash,
            cargo: "atendente",
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
        data: { nome: "Cliente Teste Mensagens", telefone },
    });
}

async function criarAtendimento(clienteId, status) {
    return prisma.conversa.create({ data: { clienteId, status } });
}

let token;

beforeEach(async () => {
    await prisma.mensagem.deleteMany({});
    await prisma.historicoAtendimento.deleteMany({});
    await prisma.conversa.deleteMany({});
    await prisma.cliente.deleteMany({});
    await prisma.usuario.deleteMany({});

    const usuario = await criarUsuarioAutenticado();
    token = gerarToken(usuario);
});

afterAll(async () => {
    await prisma.mensagem.deleteMany({});
    await prisma.historicoAtendimento.deleteMany({});
    await prisma.conversa.deleteMany({});
    await prisma.cliente.deleteMany({});
    await prisma.usuario.deleteMany({});
    await prisma.$disconnect();
});

describe("POST /api/atendimentos/:id/mensagens", () => {
    test('remetente "atendente" salva com status "enviada"', async () => {
        const cliente = await criarCliente("11922200001");
        const atendimento = await criarAtendimento(cliente.id, "aguardando");

        const resposta = await request(app)
            .post(`/api/atendimentos/${atendimento.id}/mensagens`)
            .set("Authorization", `Bearer ${token}`)
            .send({ remetente: "atendente", conteudo: "Ola, como posso ajudar?" });

        expect(resposta.status).toBe(201);
        expect(resposta.body.mensagem.status).toBe("enviada");

        const salva = await prisma.mensagem.findUnique({ where: { id: resposta.body.mensagem.id } });
        expect(salva.status).toBe("enviada");
    });

    test('remetente "cliente" salva com status "recebida"', async () => {
        const cliente = await criarCliente("11922200002");
        const atendimento = await criarAtendimento(cliente.id, "aguardando");

        const resposta = await request(app)
            .post(`/api/atendimentos/${atendimento.id}/mensagens`)
            .set("Authorization", `Bearer ${token}`)
            .send({ remetente: "cliente", conteudo: "Preciso de ajuda." });

        expect(resposta.status).toBe(201);
        expect(resposta.body.mensagem.status).toBe("recebida");

        const salva = await prisma.mensagem.findUnique({ where: { id: resposta.body.mensagem.id } });
        expect(salva.status).toBe("recebida");
    });

    test("enviar mensagem em atendimento fechado retorna 400", async () => {
        const cliente = await criarCliente("11922200003");
        const atendimento = await criarAtendimento(cliente.id, "fechado");

        const resposta = await request(app)
            .post(`/api/atendimentos/${atendimento.id}/mensagens`)
            .set("Authorization", `Bearer ${token}`)
            .send({ remetente: "atendente", conteudo: "Isso nao deveria ser salvo." });

        expect(resposta.status).toBe(400);

        const total = await prisma.mensagem.count({ where: { conversaId: atendimento.id } });
        expect(total).toBe(0);
    });
});

describe("GET /api/atendimentos/:id/mensagens", () => {
    test("listar mensagens de um atendimento em ordem cronologica", async () => {
        const cliente = await criarCliente("11922200004");
        const atendimento = await criarAtendimento(cliente.id, "aguardando");

        const base = Date.now();
        await prisma.mensagem.create({
            data: {
                conversaId: atendimento.id,
                remetente: "cliente",
                conteudo: "Primeira",
                status: "recebida",
                criadoEm: new Date(base),
            },
        });
        await prisma.mensagem.create({
            data: {
                conversaId: atendimento.id,
                remetente: "atendente",
                conteudo: "Segunda",
                status: "enviada",
                criadoEm: new Date(base + 1000),
            },
        });
        await prisma.mensagem.create({
            data: {
                conversaId: atendimento.id,
                remetente: "cliente",
                conteudo: "Terceira",
                status: "recebida",
                criadoEm: new Date(base + 2000),
            },
        });

        const resposta = await request(app)
            .get(`/api/atendimentos/${atendimento.id}/mensagens`)
            .set("Authorization", `Bearer ${token}`);

        expect(resposta.status).toBe(200);
        expect(resposta.body.mensagens.map((m) => m.conteudo)).toEqual([
            "Primeira",
            "Segunda",
            "Terceira",
        ]);
    });
});
