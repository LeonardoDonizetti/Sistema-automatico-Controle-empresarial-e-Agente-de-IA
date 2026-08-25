const request = require("supertest");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");

const app = require("../src/app");
const prisma = require("../src/config/prisma");

const ADMIN_EMAIL = "usuarios.admin.teste@teste.com";
const ATENDENTE_EMAIL = "usuarios.atendente.teste@teste.com";
const OUTRO_ATENDENTE_EMAIL = "usuarios.outro.teste@teste.com";
const SENHA = "SenhaValida123!";

async function criarUsuario({ cargo, email, ativo = true }) {
    const senhaHash = await argon2.hash(SENHA);

    return prisma.usuario.create({
        data: {
            nome: `Usuario Teste (${cargo})`,
            email,
            senhaHash,
            cargo,
            ativo,
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

describe("GET /api/usuarios (listar)", () => {
    test("admin consegue listar todos os usuarios", async () => {
        const admin = await criarUsuario({ cargo: "admin", email: ADMIN_EMAIL });
        await criarUsuario({ cargo: "atendente", email: ATENDENTE_EMAIL });

        const resposta = await request(app)
            .get("/api/usuarios")
            .set("Authorization", `Bearer ${gerarToken(admin)}`);

        expect(resposta.status).toBe(200);
        expect(resposta.body.usuarios).toHaveLength(2);
    });

    test("atendente nao consegue listar todos os usuarios (403)", async () => {
        const atendente = await criarUsuario({ cargo: "atendente", email: ATENDENTE_EMAIL });

        const resposta = await request(app)
            .get("/api/usuarios")
            .set("Authorization", `Bearer ${gerarToken(atendente)}`);

        expect(resposta.status).toBe(403);
    });
});

describe("POST /api/usuarios (criar)", () => {
    test("admin consegue criar um novo usuario", async () => {
        const admin = await criarUsuario({ cargo: "admin", email: ADMIN_EMAIL });

        const resposta = await request(app)
            .post("/api/usuarios")
            .set("Authorization", `Bearer ${gerarToken(admin)}`)
            .send({
                nome: "Usuario Criado Pelo Admin",
                email: "usuarios.novo.teste@teste.com",
                senha: "SenhaValidaNova123!",
                cargo: "atendente",
            });

        expect(resposta.status).toBe(201);
        expect(resposta.body.usuario.email).toBe("usuarios.novo.teste@teste.com");

        const criado = await prisma.usuario.findUnique({
            where: { email: "usuarios.novo.teste@teste.com" },
        });
        expect(criado).not.toBeNull();
    });

    test("atendente nao consegue criar um novo usuario (403)", async () => {
        const atendente = await criarUsuario({ cargo: "atendente", email: ATENDENTE_EMAIL });

        const resposta = await request(app)
            .post("/api/usuarios")
            .set("Authorization", `Bearer ${gerarToken(atendente)}`)
            .send({
                nome: "Usuario Nao Deveria Existir",
                email: "usuarios.bloqueado.teste@teste.com",
                senha: "SenhaValidaNova123!",
                cargo: "atendente",
            });

        expect(resposta.status).toBe(403);

        const criado = await prisma.usuario.findUnique({
            where: { email: "usuarios.bloqueado.teste@teste.com" },
        });
        expect(criado).toBeNull();
    });
});

describe("GET /api/usuarios/:id (buscar)", () => {
    test("atendente consegue ver o proprio perfil", async () => {
        const atendente = await criarUsuario({ cargo: "atendente", email: ATENDENTE_EMAIL });

        const resposta = await request(app)
            .get(`/api/usuarios/${atendente.id}`)
            .set("Authorization", `Bearer ${gerarToken(atendente)}`);

        expect(resposta.status).toBe(200);
        expect(resposta.body.usuario.id).toBe(atendente.id);
    });

    test("atendente nao consegue ver perfil de outro usuario (403)", async () => {
        const atendente = await criarUsuario({ cargo: "atendente", email: ATENDENTE_EMAIL });
        const outro = await criarUsuario({ cargo: "atendente", email: OUTRO_ATENDENTE_EMAIL });

        const resposta = await request(app)
            .get(`/api/usuarios/${outro.id}`)
            .set("Authorization", `Bearer ${gerarToken(atendente)}`);

        expect(resposta.status).toBe(403);
    });
});

describe("PATCH /api/usuarios/:id (atualizar)", () => {
    test("atendente consegue editar o proprio nome e senha", async () => {
        const atendente = await criarUsuario({ cargo: "atendente", email: ATENDENTE_EMAIL });
        const novaSenha = "NovaSenhaValida123!";

        const resposta = await request(app)
            .patch(`/api/usuarios/${atendente.id}`)
            .set("Authorization", `Bearer ${gerarToken(atendente)}`)
            .send({ nome: "Nome Atualizado", senha: novaSenha });

        expect(resposta.status).toBe(200);
        expect(resposta.body.usuario.nome).toBe("Nome Atualizado");

        const atualizado = await prisma.usuario.findUnique({ where: { id: atendente.id } });
        const senhaValida = await argon2.verify(atualizado.senhaHash, novaSenha);
        expect(senhaValida).toBe(true);
    });

    test("atendente nao consegue alterar o proprio cargo (ignorado silenciosamente)", async () => {
        const atendente = await criarUsuario({ cargo: "atendente", email: ATENDENTE_EMAIL });

        const resposta = await request(app)
            .patch(`/api/usuarios/${atendente.id}`)
            .set("Authorization", `Bearer ${gerarToken(atendente)}`)
            .send({ nome: "Nome Sem Privilegio Extra", cargo: "admin" });

        expect(resposta.status).toBe(200);
        expect(resposta.body.usuario.cargo).toBe("atendente");

        const atualizado = await prisma.usuario.findUnique({ where: { id: atendente.id } });
        expect(atualizado.cargo).toBe("atendente");
    });
});

describe("DELETE /api/usuarios/:id (inativar)", () => {
    test("admin consegue inativar (soft delete) um usuario", async () => {
        const admin = await criarUsuario({ cargo: "admin", email: ADMIN_EMAIL });
        const atendente = await criarUsuario({ cargo: "atendente", email: ATENDENTE_EMAIL });

        const resposta = await request(app)
            .delete(`/api/usuarios/${atendente.id}`)
            .set("Authorization", `Bearer ${gerarToken(admin)}`);

        expect(resposta.status).toBe(204);

        const atualizado = await prisma.usuario.findUnique({ where: { id: atendente.id } });
        expect(atualizado.ativo).toBe(false);
    });

    test("admin nao consegue inativar a si mesmo (400)", async () => {
        const admin = await criarUsuario({ cargo: "admin", email: ADMIN_EMAIL });

        const resposta = await request(app)
            .delete(`/api/usuarios/${admin.id}`)
            .set("Authorization", `Bearer ${gerarToken(admin)}`);

        expect(resposta.status).toBe(400);

        const atualizado = await prisma.usuario.findUnique({ where: { id: admin.id } });
        expect(atualizado.ativo).toBe(true);
    });
});

describe("Autenticacao exigida nas rotas de usuarios", () => {
    test("requisicao sem token retorna 401 em todas as rotas", async () => {
        const atendente = await criarUsuario({ cargo: "atendente", email: ATENDENTE_EMAIL });

        const respostas = await Promise.all([
            request(app).get("/api/usuarios"),
            request(app).post("/api/usuarios").send({}),
            request(app).get(`/api/usuarios/${atendente.id}`),
            request(app).patch(`/api/usuarios/${atendente.id}`).send({}),
            request(app).delete(`/api/usuarios/${atendente.id}`),
        ]);

        respostas.forEach((resposta) => {
            expect(resposta.status).toBe(401);
        });
    });
});
