const request = require("supertest");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");

const app = require("../src/app");
const prisma = require("../src/config/prisma");

const ADMIN_EMAIL = "dashboard.admin.teste@teste.com";
const ATENDENTE_EMAIL = "dashboard.atendente.teste@teste.com";
const SENHA = "SenhaValida123!";

async function criarUsuario(cargo, email) {
    const senhaHash = await argon2.hash(SENHA);

    return prisma.usuario.create({
        data: {
            nome: `Usuario Teste Dashboard (${cargo})`,
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
        data: { nome: "Cliente Teste Dashboard", telefone },
    });
}

let admin;
let atendente;
let tokenAdmin;
let tokenAtendente;

beforeEach(async () => {
    await prisma.historicoAtendimento.deleteMany({});
    await prisma.conversa.deleteMany({});
    await prisma.cliente.deleteMany({});
    await prisma.usuario.deleteMany({});

    admin = await criarUsuario("admin", ADMIN_EMAIL);
    atendente = await criarUsuario("atendente", ATENDENTE_EMAIL);

    tokenAdmin = gerarToken(admin);
    tokenAtendente = gerarToken(atendente);
});

afterAll(async () => {
    await prisma.historicoAtendimento.deleteMany({});
    await prisma.conversa.deleteMany({});
    await prisma.cliente.deleteMany({});
    await prisma.usuario.deleteMany({});
    await prisma.$disconnect();
});

describe("GET /api/dashboard/metricas", () => {
    test("admin consegue acessar as metricas", async () => {
        const resposta = await request(app)
            .get("/api/dashboard/metricas")
            .set("Authorization", `Bearer ${tokenAdmin}`);

        expect(resposta.status).toBe(200);
    });

    test("atendente nao consegue acessar as metricas (403)", async () => {
        const resposta = await request(app)
            .get("/api/dashboard/metricas")
            .set("Authorization", `Bearer ${tokenAtendente}`);

        expect(resposta.status).toBe(403);
    });

    test("retorna a contagem correta por status", async () => {
        const cliente = await criarCliente("11955500001");

        await prisma.conversa.create({ data: { clienteId: cliente.id, status: "aguardando" } });
        await prisma.conversa.create({ data: { clienteId: cliente.id, status: "aguardando" } });
        await prisma.conversa.create({
            data: { clienteId: cliente.id, status: "em_atendimento", atendenteId: atendente.id },
        });
        await prisma.conversa.create({
            data: { clienteId: cliente.id, status: "resolvido", atendenteId: atendente.id },
        });
        await prisma.conversa.create({ data: { clienteId: cliente.id, status: "fechado" } });

        const resposta = await request(app)
            .get("/api/dashboard/metricas")
            .set("Authorization", `Bearer ${tokenAdmin}`);

        expect(resposta.status).toBe(200);
        expect(resposta.body.totalAtendimentos).toBe(5);
        expect(resposta.body.porStatus).toEqual({
            aguardando: 2,
            em_atendimento: 1,
            resolvido: 1,
            fechado: 1,
        });
    });
});
