const request = require("supertest");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");

const app = require("../src/app");
const prisma = require("../src/config/prisma");

const ATENDENTE_EMAIL = "alertas.atendente.teste@teste.com";
const SENHA = "SenhaValida123!";

// Limite bem baixo so para estes testes, definido em runtime (nao mexe no
// .env.test nem no .env de desenvolvimento). O controller le
// process.env.ALERTA_SEM_RESPONSAVEL_MINUTOS a cada requisicao, entao basta
// sobrescrever aqui e restaurar depois para nao vazar para outros arquivos
// de teste (todos rodam no mesmo processo por causa do maxWorkers: 1).
const LIMITE_TESTE_MINUTOS = "2";
const VALOR_ORIGINAL_SEM_RESPONSAVEL = process.env.ALERTA_SEM_RESPONSAVEL_MINUTOS;
const VALOR_ORIGINAL_CLIENTE_AGUARDANDO = process.env.ALERTA_CLIENTE_AGUARDANDO_MINUTOS;

async function criarUsuarioAutenticado() {
    const senhaHash = await argon2.hash(SENHA);

    return prisma.usuario.create({
        data: {
            nome: "Atendente Teste Alertas",
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
        data: { nome: "Cliente Teste Alertas", telefone },
    });
}

let token;

beforeAll(() => {
    process.env.ALERTA_SEM_RESPONSAVEL_MINUTOS = LIMITE_TESTE_MINUTOS;
    process.env.ALERTA_CLIENTE_AGUARDANDO_MINUTOS = LIMITE_TESTE_MINUTOS;
});

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
    if (VALOR_ORIGINAL_SEM_RESPONSAVEL === undefined) {
        delete process.env.ALERTA_SEM_RESPONSAVEL_MINUTOS;
    } else {
        process.env.ALERTA_SEM_RESPONSAVEL_MINUTOS = VALOR_ORIGINAL_SEM_RESPONSAVEL;
    }

    if (VALOR_ORIGINAL_CLIENTE_AGUARDANDO === undefined) {
        delete process.env.ALERTA_CLIENTE_AGUARDANDO_MINUTOS;
    } else {
        process.env.ALERTA_CLIENTE_AGUARDANDO_MINUTOS = VALOR_ORIGINAL_CLIENTE_AGUARDANDO;
    }

    await prisma.mensagem.deleteMany({});
    await prisma.historicoAtendimento.deleteMany({});
    await prisma.conversa.deleteMany({});
    await prisma.cliente.deleteMany({});
    await prisma.usuario.deleteMany({});
    await prisma.$disconnect();
});

describe("GET /api/alertas", () => {
    test('atendimento "aguardando" sem responsavel ha mais tempo que o limite aparece em semResponsavel', async () => {
        const cliente = await criarCliente("11944400001");
        const criadoEmAntigo = new Date(Date.now() - 10 * 60 * 1000); // 10 min atras, acima do limite de 2 min

        const antigo = await prisma.conversa.create({
            data: { clienteId: cliente.id, status: "aguardando", criadoEm: criadoEmAntigo },
        });

        const resposta = await request(app)
            .get("/api/alertas")
            .set("Authorization", `Bearer ${token}`);

        expect(resposta.status).toBe(200);

        const ids = resposta.body.alertas.semResponsavel.map((a) => a.atendimentoId);
        expect(ids).toContain(antigo.id);
    });

    test("atendimento recem-criado (dentro do limite) nao aparece na lista de alertas", async () => {
        const cliente = await criarCliente("11944400002");

        const recente = await prisma.conversa.create({
            data: { clienteId: cliente.id, status: "aguardando", criadoEm: new Date() },
        });

        const resposta = await request(app)
            .get("/api/alertas")
            .set("Authorization", `Bearer ${token}`);

        expect(resposta.status).toBe(200);

        const ids = resposta.body.alertas.semResponsavel.map((a) => a.atendimentoId);
        expect(ids).not.toContain(recente.id);
    });
});
