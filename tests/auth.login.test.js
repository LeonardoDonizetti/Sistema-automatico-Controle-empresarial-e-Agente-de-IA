const request = require("supertest");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");

const app = require("../src/app");
const prisma = require("../src/config/prisma");

const EMAIL = "auth.login.teste@teste.com";
const SENHA = "SenhaCorreta123!";

async function criarUsuarioTeste(overrides = {}) {
    const senhaHash = await argon2.hash(SENHA);

    return prisma.usuario.create({
        data: {
            nome: "Usuario Teste Login",
            email: EMAIL,
            senhaHash,
            cargo: "atendente",
            ativo: true,
            ...overrides,
        },
    });
}

beforeEach(async () => {
    await prisma.usuario.deleteMany({});
});

afterAll(async () => {
    await prisma.usuario.deleteMany({});
    await prisma.$disconnect();
});

describe("POST /api/auth/login", () => {
    test("credenciais corretas retorna 200 e um token JWT valido", async () => {
        const usuario = await criarUsuarioTeste();

        const resposta = await request(app)
            .post("/api/auth/login")
            .send({ email: EMAIL, senha: SENHA });

        expect(resposta.status).toBe(200);
        expect(typeof resposta.body.token).toBe("string");

        const payload = jwt.verify(resposta.body.token, process.env.JWT_SECRET, {
            algorithms: ["HS256"],
            issuer: "sistema-atendimento",
            audience: "painel-atendimento",
        });

        expect(payload.sub).toBe(String(usuario.id));
        expect(payload.cargo).toBe("atendente");
    });

    test("senha errada retorna 401", async () => {
        await criarUsuarioTeste();

        const resposta = await request(app)
            .post("/api/auth/login")
            .send({ email: EMAIL, senha: "SenhaErrada999" });

        expect(resposta.status).toBe(401);
        expect(resposta.body.erro).toBe("E-mail ou senha inválidos.");
    });

    test("email inexistente retorna 401 com a mesma mensagem generica de senha errada", async () => {
        const resposta = await request(app)
            .post("/api/auth/login")
            .send({ email: "naoexiste@teste.com", senha: SENHA });

        expect(resposta.status).toBe(401);
        expect(resposta.body.erro).toBe("E-mail ou senha inválidos.");
    });

    test("usuario inativo retorna 401", async () => {
        await criarUsuarioTeste({ ativo: false });

        const resposta = await request(app)
            .post("/api/auth/login")
            .send({ email: EMAIL, senha: SENHA });

        expect(resposta.status).toBe(401);
        expect(resposta.body.erro).toBe("E-mail ou senha inválidos.");
    });
});
