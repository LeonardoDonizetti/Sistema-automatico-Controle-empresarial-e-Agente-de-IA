const request = require("supertest");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");

const app = require("../src/app");
const prisma = require("../src/config/prisma");

const ATENDENTE_EMAIL = "pedidos.atendente.teste@teste.com";
const SENHA = "SenhaValida123!";

async function criarUsuarioAutenticado() {
    const senhaHash = await argon2.hash(SENHA);

    return prisma.usuario.create({
        data: {
            nome: "Atendente Teste Pedidos",
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
        data: { nome: "Cliente Teste Pedidos", telefone },
    });
}

async function criarAtendimento(clienteId) {
    return prisma.conversa.create({ data: { clienteId, status: "aguardando" } });
}

let token;

beforeEach(async () => {
    await prisma.itemPedido.deleteMany({});
    await prisma.pedido.deleteMany({});
    await prisma.historicoAtendimento.deleteMany({});
    await prisma.conversa.deleteMany({});
    await prisma.cliente.deleteMany({});
    await prisma.usuario.deleteMany({});

    const usuario = await criarUsuarioAutenticado();
    token = gerarToken(usuario);
});

afterAll(async () => {
    await prisma.itemPedido.deleteMany({});
    await prisma.pedido.deleteMany({});
    await prisma.historicoAtendimento.deleteMany({});
    await prisma.conversa.deleteMany({});
    await prisma.cliente.deleteMany({});
    await prisma.usuario.deleteMany({});
    await prisma.$disconnect();
});

describe("POST /api/pedidos (criar)", () => {
    test("criar pedido com itens calcula o valorTotal corretamente", async () => {
        const cliente = await criarCliente("11933300001");
        const atendimento = await criarAtendimento(cliente.id);

        const resposta = await request(app)
            .post("/api/pedidos")
            .set("Authorization", `Bearer ${token}`)
            .send({
                atendimentoId: atendimento.id,
                itens: [
                    { descricao: "Item A", quantidade: 2, precoUnitario: 10.5 },
                    { descricao: "Item B", quantidade: 1, precoUnitario: 5.25 },
                ],
            });

        expect(resposta.status).toBe(201);
        expect(resposta.body.pedido.valorTotal).toBe(26.25);
        expect(resposta.body.pedido.itens).toHaveLength(2);
    });

    test("criar pedido sem nenhum item retorna 400", async () => {
        const cliente = await criarCliente("11933300002");
        const atendimento = await criarAtendimento(cliente.id);

        const resposta = await request(app)
            .post("/api/pedidos")
            .set("Authorization", `Bearer ${token}`)
            .send({ atendimentoId: atendimento.id, itens: [] });

        expect(resposta.status).toBe(400);

        const total = await prisma.pedido.count({ where: { atendimentoId: atendimento.id } });
        expect(total).toBe(0);
    });
});

describe("PATCH /api/pedidos/:id (transicao de status)", () => {
    test("transicao invalida (orcamento -> em_producao direto) retorna 400", async () => {
        const cliente = await criarCliente("11933300003");
        const atendimento = await criarAtendimento(cliente.id);

        const pedido = await prisma.pedido.create({
            data: {
                atendimentoId: atendimento.id,
                clienteId: cliente.id,
                itens: { create: [{ descricao: "Item", quantidade: 1, precoUnitarioCentavos: 1000 }] },
            },
        });

        const resposta = await request(app)
            .patch(`/api/pedidos/${pedido.id}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ status: "em_producao" });

        expect(resposta.status).toBe(400);

        const inalterado = await prisma.pedido.findUnique({ where: { id: pedido.id } });
        expect(inalterado.status).toBe("orcamento");
    });
});

describe("POST /api/pedidos/:id/itens (adicionar item)", () => {
    test("adicionar item a um pedido existente recalcula o valorTotal", async () => {
        const cliente = await criarCliente("11933300004");
        const atendimento = await criarAtendimento(cliente.id);

        const pedido = await prisma.pedido.create({
            data: {
                atendimentoId: atendimento.id,
                clienteId: cliente.id,
                itens: { create: [{ descricao: "Item Inicial", quantidade: 1, precoUnitarioCentavos: 1000 }] },
            },
        });

        const resposta = await request(app)
            .post(`/api/pedidos/${pedido.id}/itens`)
            .set("Authorization", `Bearer ${token}`)
            .send({ descricao: "Item Adicional", quantidade: 3, precoUnitario: 2.5 });

        expect(resposta.status).toBe(201);
        expect(resposta.body.pedido.itens).toHaveLength(2);
        expect(resposta.body.pedido.valorTotal).toBe(17.5);
    });
});

describe("DELETE /api/pedidos/:id/itens/:itemId (remover item)", () => {
    test("remover o ultimo item de um pedido retorna 400", async () => {
        const cliente = await criarCliente("11933300005");
        const atendimento = await criarAtendimento(cliente.id);

        const pedido = await prisma.pedido.create({
            data: {
                atendimentoId: atendimento.id,
                clienteId: cliente.id,
                itens: { create: [{ descricao: "Unico Item", quantidade: 1, precoUnitarioCentavos: 1000 }] },
            },
            include: { itens: true },
        });
        const item = pedido.itens[0];

        const resposta = await request(app)
            .delete(`/api/pedidos/${pedido.id}/itens/${item.id}`)
            .set("Authorization", `Bearer ${token}`);

        expect(resposta.status).toBe(400);

        const total = await prisma.itemPedido.count({ where: { pedidoId: pedido.id } });
        expect(total).toBe(1);
    });
});
