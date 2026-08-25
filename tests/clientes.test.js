const request = require("supertest");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");

const app = require("../src/app");
const prisma = require("../src/config/prisma");

const ATENDENTE_EMAIL = "clientes.atendente.teste@teste.com";
const SENHA = "SenhaValida123!";

async function criarUsuarioAutenticado() {
    const senhaHash = await argon2.hash(SENHA);

    return prisma.usuario.create({
        data: {
            nome: "Atendente Teste Clientes",
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

let token;

beforeEach(async () => {
    await prisma.cliente.deleteMany({});
    await prisma.usuario.deleteMany({});

    const usuario = await criarUsuarioAutenticado();
    token = gerarToken(usuario);
});

afterAll(async () => {
    await prisma.cliente.deleteMany({});
    await prisma.usuario.deleteMany({});
    await prisma.$disconnect();
});

describe("POST /api/clientes (criar)", () => {
    test("criar cliente com sucesso", async () => {
        const resposta = await request(app)
            .post("/api/clientes")
            .set("Authorization", `Bearer ${token}`)
            .send({ nome: "Cliente Teste", telefone: "11987654321" });

        expect(resposta.status).toBe(201);
        expect(resposta.body.cliente.nome).toBe("Cliente Teste");
        expect(resposta.body.cliente.telefone).toBe("11987654321");

        const criado = await prisma.cliente.findUnique({ where: { telefone: "11987654321" } });
        expect(criado).not.toBeNull();
    });

    test("criar cliente com telefone duplicado retorna 409", async () => {
        await request(app)
            .post("/api/clientes")
            .set("Authorization", `Bearer ${token}`)
            .send({ nome: "Cliente Um", telefone: "11987654321" });

        const resposta = await request(app)
            .post("/api/clientes")
            .set("Authorization", `Bearer ${token}`)
            .send({ nome: "Cliente Dois", telefone: "11987654321" });

        expect(resposta.status).toBe(409);

        const total = await prisma.cliente.count({ where: { telefone: "11987654321" } });
        expect(total).toBe(1);
    });
});

describe("GET /api/clientes (listar)", () => {
    test("listar clientes", async () => {
        await prisma.cliente.create({ data: { nome: "Cliente A", telefone: "11911111111" } });
        await prisma.cliente.create({ data: { nome: "Cliente B", telefone: "11922222222" } });

        const resposta = await request(app)
            .get("/api/clientes")
            .set("Authorization", `Bearer ${token}`);

        expect(resposta.status).toBe(200);
        expect(resposta.body.clientes).toHaveLength(2);
    });
});

describe("PATCH /api/clientes/:id (editar)", () => {
    test("editar cliente", async () => {
        const cliente = await prisma.cliente.create({
            data: { nome: "Nome Antigo", telefone: "11933333333" },
        });

        const resposta = await request(app)
            .patch(`/api/clientes/${cliente.id}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ nome: "Nome Novo" });

        expect(resposta.status).toBe(200);
        expect(resposta.body.cliente.nome).toBe("Nome Novo");

        const atualizado = await prisma.cliente.findUnique({ where: { id: cliente.id } });
        expect(atualizado.nome).toBe("Nome Novo");
    });
});
