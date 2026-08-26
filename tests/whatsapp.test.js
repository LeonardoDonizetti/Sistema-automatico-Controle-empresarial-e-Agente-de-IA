const request = require("supertest");

const app = require("../src/app");
const prisma = require("../src/config/prisma");

function payloadMensagem({ telefone, texto, wamid }) {
    return {
        entry: [
            {
                changes: [
                    {
                        value: {
                            messages: [
                                {
                                    id: wamid,
                                    from: telefone,
                                    text: { body: texto },
                                    type: "text",
                                },
                            ],
                        },
                    },
                ],
            },
        ],
    };
}

async function limparDados() {
    await prisma.mensagem.deleteMany({});
    await prisma.historicoAtendimento.deleteMany({});
    await prisma.conversa.deleteMany({});
    await prisma.cliente.deleteMany({});
    await prisma.aguardandoNomeWhatsapp.deleteMany({});
    await prisma.mensagemWhatsappProcessada.deleteMany({});
}

beforeEach(async () => {
    await limparDados();

    global.fetch = jest.fn((url) => {
        if (typeof url === "string" && url.includes("generativelanguage.googleapis.com")) {
            return Promise.resolve({
                ok: true,
                json: () =>
                    Promise.resolve({
                        candidates: [{ content: { parts: [{ text: "Oi! Qual é o seu nome?" }] } }],
                    }),
            });
        }

        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
            text: () => Promise.resolve(""),
        });
    });
});

afterAll(async () => {
    await limparDados();
    await prisma.$disconnect();
});

describe("POST /api/whatsapp/webhook", () => {
    test("payload sem mensagem responde 200 e nao faz nada", async () => {
        const resposta = await request(app)
            .post("/api/whatsapp/webhook")
            .send({ entry: [{ changes: [{ value: {} }] }] });

        expect(resposta.status).toBe(200);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test("telefone novo, primeira mensagem: cria AguardandoNomeWhatsapp e envia pergunta de nome", async () => {
        const telefone = "5511900000001";

        const resposta = await request(app)
            .post("/api/whatsapp/webhook")
            .send(payloadMensagem({ telefone, texto: "Oi", wamid: "wamid-1" }));

        expect(resposta.status).toBe(200);

        const aguardando = await prisma.aguardandoNomeWhatsapp.findUnique({ where: { telefone } });
        expect(aguardando).not.toBeNull();

        const cliente = await prisma.cliente.findUnique({ where: { telefone } });
        expect(cliente).toBeNull();

        expect(global.fetch).toHaveBeenCalledTimes(2); // Gemini (pergunta) + envio WhatsApp
        const chamadaEnvio = global.fetch.mock.calls.find(([url]) => url.includes("graph.facebook.com"));
        expect(chamadaEnvio).toBeDefined();
        const corpoEnvio = JSON.parse(chamadaEnvio[1].body);
        expect(corpoEnvio.to).toBe(telefone);
        expect(corpoEnvio.text.body).toBe("Oi! Qual é o seu nome?");
    });

    test("telefone novo, segunda mensagem (com nome): cria Cliente e Atendimento, remove AguardandoNomeWhatsapp", async () => {
        const telefone = "5511900000002";
        await prisma.aguardandoNomeWhatsapp.create({ data: { telefone } });

        const resposta = await request(app)
            .post("/api/whatsapp/webhook")
            .send(payloadMensagem({ telefone, texto: "Maria Silva", wamid: "wamid-2" }));

        expect(resposta.status).toBe(200);

        const cliente = await prisma.cliente.findUnique({ where: { telefone } });
        expect(cliente).not.toBeNull();
        expect(cliente.nome).toBe("Maria Silva");

        const atendimento = await prisma.conversa.findFirst({ where: { clienteId: cliente.id } });
        expect(atendimento).not.toBeNull();
        expect(atendimento.status).toBe("aguardando");
        expect(atendimento.atendenteId).toBeNull();

        const aguardando = await prisma.aguardandoNomeWhatsapp.findUnique({ where: { telefone } });
        expect(aguardando).toBeNull();

        expect(global.fetch).toHaveBeenCalledTimes(1); // so o envio de confirmacao (nao chama Gemini aqui)
        const corpoEnvio = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(corpoEnvio.text.body).toContain("Maria Silva");
    });

    test("cliente ja cadastrado sem atendimento aberto: cria atendimento e registra mensagem", async () => {
        const telefone = "5511900000003";
        const cliente = await prisma.cliente.create({ data: { nome: "Cliente Existente", telefone } });

        const resposta = await request(app)
            .post("/api/whatsapp/webhook")
            .send(payloadMensagem({ telefone, texto: "Preciso de ajuda", wamid: "wamid-3" }));

        expect(resposta.status).toBe(200);

        const atendimento = await prisma.conversa.findFirst({ where: { clienteId: cliente.id } });
        expect(atendimento).not.toBeNull();
        expect(atendimento.status).toBe("aguardando");

        const mensagens = await prisma.mensagem.findMany({ where: { conversaId: atendimento.id } });
        expect(mensagens).toHaveLength(1);
        expect(mensagens[0].remetente).toBe("cliente");
        expect(mensagens[0].conteudo).toBe("Preciso de ajuda");
        expect(mensagens[0].status).toBe("recebida");

        expect(global.fetch).not.toHaveBeenCalled(); // nao responde automaticamente
    });

    test("cliente ja cadastrado com atendimento aberto: reaproveita o atendimento existente", async () => {
        const telefone = "5511900000004";
        const cliente = await prisma.cliente.create({ data: { nome: "Cliente Existente 2", telefone } });
        const atendimentoAberto = await prisma.conversa.create({
            data: { clienteId: cliente.id, status: "em_atendimento" },
        });

        const resposta = await request(app)
            .post("/api/whatsapp/webhook")
            .send(payloadMensagem({ telefone, texto: "Segunda mensagem", wamid: "wamid-4" }));

        expect(resposta.status).toBe(200);

        const totalAtendimentos = await prisma.conversa.count({ where: { clienteId: cliente.id } });
        expect(totalAtendimentos).toBe(1);

        const mensagens = await prisma.mensagem.findMany({ where: { conversaId: atendimentoAberto.id } });
        expect(mensagens).toHaveLength(1);
    });

    test("cliente com atendimento fechado: cria um novo atendimento", async () => {
        const telefone = "5511900000005";
        const cliente = await prisma.cliente.create({ data: { nome: "Cliente Fechado", telefone } });
        await prisma.conversa.create({ data: { clienteId: cliente.id, status: "fechado" } });

        const resposta = await request(app)
            .post("/api/whatsapp/webhook")
            .send(payloadMensagem({ telefone, texto: "Voltei", wamid: "wamid-5" }));

        expect(resposta.status).toBe(200);

        const totalAtendimentos = await prisma.conversa.count({ where: { clienteId: cliente.id } });
        expect(totalAtendimentos).toBe(2);

        const novoAberto = await prisma.conversa.findFirst({
            where: { clienteId: cliente.id, status: { not: "fechado" } },
        });
        expect(novoAberto).not.toBeNull();
    });

    test("idempotencia: mesmo wamid processado duas vezes so gera efeito uma vez", async () => {
        const telefone = "5511900000006";
        const cliente = await prisma.cliente.create({ data: { nome: "Cliente Idempotencia", telefone } });
        const atendimento = await prisma.conversa.create({ data: { clienteId: cliente.id, status: "aguardando" } });

        const payload = payloadMensagem({ telefone, texto: "Mensagem unica", wamid: "wamid-repetido" });

        const primeira = await request(app).post("/api/whatsapp/webhook").send(payload);
        const segunda = await request(app).post("/api/whatsapp/webhook").send(payload);

        expect(primeira.status).toBe(200);
        expect(segunda.status).toBe(200);

        const mensagens = await prisma.mensagem.findMany({ where: { conversaId: atendimento.id } });
        expect(mensagens).toHaveLength(1);

        const processadas = await prisma.mensagemWhatsappProcessada.count({ where: { wamid: "wamid-repetido" } });
        expect(processadas).toBe(1);
    });

    test("falha na chamada do Gemini usa mensagem fixa de fallback", async () => {
        global.fetch = jest.fn((url) => {
            if (typeof url === "string" && url.includes("generativelanguage.googleapis.com")) {
                return Promise.reject(new Error("Falha simulada no Gemini"));
            }

            return Promise.resolve({ ok: true, json: () => Promise.resolve({}), text: () => Promise.resolve("") });
        });

        const telefone = "5511900000007";

        const resposta = await request(app)
            .post("/api/whatsapp/webhook")
            .send(payloadMensagem({ telefone, texto: "Oi", wamid: "wamid-7" }));

        expect(resposta.status).toBe(200);

        const chamadaEnvio = global.fetch.mock.calls.find(([url]) => url.includes("graph.facebook.com"));
        const corpoEnvio = JSON.parse(chamadaEnvio[1].body);
        expect(corpoEnvio.text.body).toBe("Olá! Para começarmos, qual é o seu nome?");
    });

    test("falha no envio via WhatsApp nao derruba o webhook", async () => {
        global.fetch = jest.fn(() => Promise.reject(new Error("Falha simulada de rede")));

        const telefone = "5511900000008";

        const resposta = await request(app)
            .post("/api/whatsapp/webhook")
            .send(payloadMensagem({ telefone, texto: "Oi", wamid: "wamid-8" }));

        expect(resposta.status).toBe(200);

        const aguardando = await prisma.aguardandoNomeWhatsapp.findUnique({ where: { telefone } });
        expect(aguardando).not.toBeNull();
    });
});
