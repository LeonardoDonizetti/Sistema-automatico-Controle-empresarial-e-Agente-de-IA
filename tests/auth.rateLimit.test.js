const request = require("supertest");
const argon2 = require("argon2");

const app = require("../src/app");
const prisma = require("../src/config/prisma");

const EMAIL = "auth.ratelimit.teste@teste.com";
const SENHA = "SenhaCorreta123!";

beforeEach(async () => {
    await prisma.usuario.deleteMany({});

    const senhaHash = await argon2.hash(SENHA);

    await prisma.usuario.create({
        data: {
            nome: "Usuario Teste Rate Limit",
            email: EMAIL,
            senhaHash,
            cargo: "atendente",
            ativo: true,
        },
    });
});

afterAll(async () => {
    await prisma.usuario.deleteMany({});
    await prisma.$disconnect();
});

describe("Rate limit do login", () => {
    test("mais de 5 tentativas seguidas retorna 429", async () => {
        for (let tentativa = 0; tentativa < 5; tentativa++) {
            const resposta = await request(app)
                .post("/api/auth/login")
                .send({ email: EMAIL, senha: "SenhaErrada999" });

            expect(resposta.status).toBe(401);
        }

        const sextaTentativa = await request(app)
            .post("/api/auth/login")
            .send({ email: EMAIL, senha: "SenhaErrada999" });

        expect(sextaTentativa.status).toBe(429);
    });
});
