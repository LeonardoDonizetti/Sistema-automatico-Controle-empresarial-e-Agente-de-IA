const prisma = require("../config/prisma");

const PERGUNTA_NOME_FALLBACK = "Olá! Para começarmos, qual é o seu nome?";

async function enviarMensagemWhatsapp(telefone, texto) {
    try {
        const url = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

        const resposta = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: telefone,
                type: "text",
                text: { body: texto },
            }),
        });

        if (!resposta.ok) {
            const corpo = await resposta.text();
            console.error("Erro ao enviar mensagem WhatsApp:", resposta.status, corpo);
        }
    } catch (error) {
        console.error("Erro ao enviar mensagem WhatsApp:", error.message);
    }
}

async function gerarPerguntaDeNome() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`;

        const resposta = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: "Gere uma mensagem curta e simpática, em português, perguntando o nome da pessoa, adequada para o primeiro contato de uma empresa via WhatsApp. Responda apenas com a mensagem, sem aspas ou explicações.",
                            },
                        ],
                    },
                ],
            }),
        });

        if (!resposta.ok) {
            throw new Error(`Gemini respondeu com status ${resposta.status}`);
        }

        const dados = await resposta.json();
        const texto = dados?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!texto) {
            throw new Error("Resposta do Gemini sem texto.");
        }

        return texto;
    } catch (error) {
        console.error("Erro ao gerar pergunta de nome via Gemini:", error.message);
        return PERGUNTA_NOME_FALLBACK;
    }
}

function verificarWebhook(req, res) {
    const modo = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (modo === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        return res.status(200).send(challenge);
    }

    return res.sendStatus(403);
}

async function receberWebhook(req, res) {
    try {
        const mensagemRecebida = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

        if (!mensagemRecebida) {
            return res.sendStatus(200);
        }

        const wamid = mensagemRecebida.id;
        const telefone = mensagemRecebida.from;
        const texto = mensagemRecebida.text?.body || "";

        if (!wamid || !telefone) {
            return res.sendStatus(200);
        }

        try {
            await prisma.mensagemWhatsappProcessada.create({ data: { wamid } });
        } catch (error) {
            if (error.code === "P2002") {
                return res.sendStatus(200);
            }
            throw error;
        }

        const cliente = await prisma.cliente.findUnique({ where: { telefone } });

        if (!cliente) {
            const aguardando = await prisma.aguardandoNomeWhatsapp.findUnique({ where: { telefone } });

            if (!aguardando) {
                await prisma.aguardandoNomeWhatsapp.create({ data: { telefone } });

                const pergunta = await gerarPerguntaDeNome();
                await enviarMensagemWhatsapp(telefone, pergunta);

                return res.sendStatus(200);
            }

            const novoCliente = await prisma.$transaction(async (tx) => {
                const clienteCriado = await tx.cliente.create({
                    data: { nome: texto, telefone },
                });

                await tx.conversa.create({
                    data: { clienteId: clienteCriado.id, status: "aguardando" },
                });

                await tx.aguardandoNomeWhatsapp.delete({ where: { telefone } });

                return clienteCriado;
            });

            await enviarMensagemWhatsapp(
                telefone,
                `Obrigado, ${novoCliente.nome}! Em breve um atendente vai falar com você.`
            );

            return res.sendStatus(200);
        }

        let atendimento = await prisma.conversa.findFirst({
            where: { clienteId: cliente.id, status: { not: "fechado" } },
            orderBy: { criadoEm: "desc" },
        });

        if (!atendimento) {
            atendimento = await prisma.conversa.create({
                data: { clienteId: cliente.id, status: "aguardando" },
            });
        }

        await prisma.mensagem.create({
            data: {
                conversaId: atendimento.id,
                remetente: "cliente",
                conteudo: texto,
                status: "recebida",
            },
        });

        return res.sendStatus(200);
    } catch (error) {
        console.error("Erro no webhook do WhatsApp:", error.message);
        return res.sendStatus(200);
    }
}

module.exports = {
    verificarWebhook,
    receberWebhook,
    enviarMensagemWhatsapp,
    gerarPerguntaDeNome,
};
