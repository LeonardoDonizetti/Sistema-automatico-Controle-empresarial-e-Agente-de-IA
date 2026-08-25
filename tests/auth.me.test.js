const request = require("supertest");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");

const app = require("../src/app");
const prisma = require("../src/config/prisma");

const EMAIL = "auth.me.teste@teste.com";
const SENHA = "SenhaCorreta123!";

async function criarUsuarioTeste() {
    const senhaHash = await argon2.hash(SENHA);

    return prisma.usuario.create({
        data: {
            nome: "Usuario Teste Me",
            email: EMAIL,
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

beforeEach(async () => {
    await prisma.usuario.deleteMany({});
});

afterAll(async () => {
    await prisma.usuario.deleteMany({});
    await prisma.$disconnect();
});

describe("GET /api/auth/me", () => {
    test("sem token retorna 401", async () => {
        const resposta = await request(app).get("/api/auth/me");

        expect(resposta.status).toBe(401);
    });

    test("com token valido retorna os dados do usuario logado", async () => {
        const usuario = await criarUsuarioTeste();
        const token = gerarToken(usuario);

        const resposta = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${token}`);

        expect(resposta.status).toBe(200);
        expect(resposta.body.usuario.sub).toBe(String(usuario.id));
        expect(resposta.body.usuario.cargo).toBe(usuario.cargo);
    });

    test("com token invalido/adulterado retorna 401", async () => {
        const usuario = await criarUsuarioTeste();
        const tokenAdulterado = gerarToken(usuario) + "adulterado";

        const resposta = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${tokenAdulterado}`);

        expect(resposta.status).toBe(401);
    });
});
