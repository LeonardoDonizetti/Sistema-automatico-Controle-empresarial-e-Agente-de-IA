const request = require("supertest");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");

const app = require("../src/app");
const prisma = require("../src/config/prisma");

const ATENDENTE_EMAIL = "clientes.atendente.teste@teste.com";
const ADMIN_EMAIL = "clientes.admin.teste@teste.com";
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

async function criarAdminAutenticado() {
    const senhaHash = await argon2.hash(SENHA);

    return prisma.usuario.create({
        data: {
            nome: "Admin Teste Clientes",
            email: ADMIN_EMAIL,
            senhaHash,
            cargo: "admin",
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
let tokenAdmin;

async function limparDados() {
    await prisma.itemPedido.deleteMany({});
    await prisma.pedido.deleteMany({});
    await prisma.mensagem.deleteMany({});
    await prisma.historicoAtendimento.deleteMany({});
    await prisma.conversa.deleteMany({});
    await prisma.cliente.deleteMany({});
    await prisma.usuario.deleteMany({});
}

beforeEach(async () => {
    await limparDados();

    const usuario = await criarUsuarioAutenticado();
    token = gerarToken(usuario);

    const admin = await criarAdminAutenticado();
    tokenAdmin = gerarToken(admin);
});

afterAll(async () => {
    await limparDados();
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

describe("DELETE /api/clientes/:id (excluir)", () => {
    test("atendente (nao-admin) nao pode excluir cliente: retorna 403", async () => {
        const cliente = await prisma.cliente.create({
            data: { nome: "Cliente Sem Historico", telefone: "11944444401" },
        });

        const resposta = await request(app)
            .delete(`/api/clientes/${cliente.id}`)
            .set("Authorization", `Bearer ${token}`);

        expect(resposta.status).toBe(403);

        const aindaExiste = await prisma.cliente.findUnique({ where: { id: cliente.id } });
        expect(aindaExiste).not.toBeNull();
    });

    test("admin exclui com sucesso cliente sem atendimentos", async () => {
        const cliente = await prisma.cliente.create({
            data: { nome: "Cliente Sem Historico", telefone: "11944444402" },
        });

        const resposta = await request(app)
            .delete(`/api/clientes/${cliente.id}`)
            .set("Authorization", `Bearer ${tokenAdmin}`);

        expect(resposta.status).toBe(204);

        const removido = await prisma.cliente.findUnique({ where: { id: cliente.id } });
        expect(removido).toBeNull();
    });

    test("admin exclui com sucesso cliente com atendimento vazio (sem mensagens), em cascata", async () => {
        const cliente = await prisma.cliente.create({
            data: { nome: "Cliente Atendimento Vazio", telefone: "11944444403" },
        });
        const atendimento = await prisma.conversa.create({
            data: { clienteId: cliente.id, status: "aguardando" },
        });
        await prisma.historicoAtendimento.create({
            data: {
                atendimentoId: atendimento.id,
                tipo: "criacao",
                descricao: "Atendimento criado e adicionado à fila de espera.",
            },
        });

        const resposta = await request(app)
            .delete(`/api/clientes/${cliente.id}`)
            .set("Authorization", `Bearer ${tokenAdmin}`);

        expect(resposta.status).toBe(204);

        const clienteRemovido = await prisma.cliente.findUnique({ where: { id: cliente.id } });
        expect(clienteRemovido).toBeNull();

        const atendimentoRemovido = await prisma.conversa.findUnique({ where: { id: atendimento.id } });
        expect(atendimentoRemovido).toBeNull();

        const historicoRemovido = await prisma.historicoAtendimento.findMany({
            where: { atendimentoId: atendimento.id },
        });
        expect(historicoRemovido).toHaveLength(0);
    });

    test("bloqueia com 409 cliente com pedido vinculado", async () => {
        const cliente = await prisma.cliente.create({
            data: { nome: "Cliente Com Pedido", telefone: "11944444404" },
        });
        const atendimento = await prisma.conversa.create({
            data: { clienteId: cliente.id, status: "aguardando" },
        });
        await prisma.pedido.create({
            data: { atendimentoId: atendimento.id, clienteId: cliente.id, status: "orcamento" },
        });

        const resposta = await request(app)
            .delete(`/api/clientes/${cliente.id}`)
            .set("Authorization", `Bearer ${tokenAdmin}`);

        expect(resposta.status).toBe(409);
        expect(resposta.body.erro).toBe("Não é possível excluir: este cliente possui pedidos registrados.");

        const aindaExiste = await prisma.cliente.findUnique({ where: { id: cliente.id } });
        expect(aindaExiste).not.toBeNull();
    });

    test("bloqueia com 409 cliente com mensagens reais registradas", async () => {
        const cliente = await prisma.cliente.create({
            data: { nome: "Cliente Com Mensagem", telefone: "11944444405" },
        });
        const atendimento = await prisma.conversa.create({
            data: { clienteId: cliente.id, status: "aguardando" },
        });
        await prisma.mensagem.create({
            data: {
                conversaId: atendimento.id,
                remetente: "cliente",
                conteudo: "Preciso de ajuda.",
                status: "recebida",
            },
        });

        const resposta = await request(app)
            .delete(`/api/clientes/${cliente.id}`)
            .set("Authorization", `Bearer ${tokenAdmin}`);

        expect(resposta.status).toBe(409);
        expect(resposta.body.erro).toBe("Não é possível excluir: este cliente possui histórico de atendimento.");

        const aindaExiste = await prisma.cliente.findUnique({ where: { id: cliente.id } });
        expect(aindaExiste).not.toBeNull();

        const atendimentoAindaExiste = await prisma.conversa.findUnique({ where: { id: atendimento.id } });
        expect(atendimentoAindaExiste).not.toBeNull();
    });

    test("cliente inexistente retorna 404", async () => {
        const resposta = await request(app)
            .delete("/api/clientes/999999")
            .set("Authorization", `Bearer ${tokenAdmin}`);

        expect(resposta.status).toBe(404);
    });
});
