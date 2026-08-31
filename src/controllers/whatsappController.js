const prisma = require("../config/prisma");

const PERGUNTA_NOME_FALLBACK = "Olá! Para começarmos, qual é o seu nome?";
const PERGUNTA_NOME_RETRY = "Desculpe, não entendi. Pode me dizer seu nome, por favor?";

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
            return false;
        }

        return true;
    } catch (error) {
        console.error("Erro ao enviar mensagem WhatsApp:", error.message);
        return false;
    }
}

async function gerarPerguntaDeNome() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`;

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

async function validarNome(texto) {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`;

        const resposta = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: `Uma empresa perguntou "qual é o seu nome?" a um cliente pelo WhatsApp e recebeu a seguinte resposta:\n\n"${texto}"\n\nAnalise se essa resposta realmente é (ou contém) o nome de uma pessoa, e não outra coisa (uma pergunta, saudação, reclamação, número, ou qualquer frase que não seja um nome). Responda apenas com um JSON no formato {"eh_nome": true ou false, "nome_extraido": "nome da pessoa limpo e com a capitalização correta, ou string vazia se eh_nome for false"}.`,
                            },
                        ],
                    },
                ],
                generationConfig: {
                    responseMimeType: "application/json",
                },
            }),
        });

        if (!resposta.ok) {
            throw new Error(`Gemini respondeu com status ${resposta.status}`);
        }

        const dados = await resposta.json();
        const textoResposta = dados?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textoResposta) {
            throw new Error("Resposta do Gemini sem texto.");
        }

        const json = JSON.parse(textoResposta);

        if (typeof json.eh_nome !== "boolean") {
            throw new Error("Resposta do Gemini em formato inesperado.");
        }

        return json;
    } catch (error) {
        console.error("Erro ao validar nome via Gemini:", error.message);
        return { eh_nome: true, nome_extraido: texto };
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
    console.log("WEBHOOK POST RECEBIDO", new Date().toISOString());

    try {
        console.log("1 - extraindo mensagem do payload");
        const mensagemRecebida = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

        if (!mensagemRecebida) {
            console.log("1b - nenhuma mensagem no payload, encerrando");
            return res.sendStatus(200);
        }

        const wamid = mensagemRecebida.id;
        const telefone = mensagemRecebida.from;
        const texto = mensagemRecebida.text?.body || "";

        if (!wamid || !telefone) {
            console.log("1c - wamid ou telefone ausente, encerrando");
            return res.sendStatus(200);
        }

        console.log("2 - verificando idempotencia (wamid:", wamid, ")");
        try {
            await prisma.mensagemWhatsappProcessada.create({ data: { wamid } });
        } catch (error) {
            if (error.code === "P2002") {
                console.log("2b - wamid ja processado antes, encerrando");
                return res.sendStatus(200);
            }
            throw error;
        }

        console.log("3 - buscando cliente pelo telefone");
        const cliente = await prisma.cliente.findUnique({ where: { telefone } });

        if (!cliente) {
            console.log("4 - cliente nao encontrado, verificando AguardandoNomeWhatsapp");
            const aguardando = await prisma.aguardandoNomeWhatsapp.findUnique({ where: { telefone } });

            if (!aguardando) {
                console.log("5 - primeira mensagem deste telefone, criando AguardandoNomeWhatsapp");
                await prisma.aguardandoNomeWhatsapp.create({ data: { telefone } });

                console.log("6 - chamando Gemini para gerar pergunta de nome");
                const pergunta = await gerarPerguntaDeNome();

                console.log("7 - enviando pergunta de nome via WhatsApp");
                const enviou7 = await enviarMensagemWhatsapp(telefone, pergunta);
                console.log("7b - resultado do envio:", enviou7 ? "sucesso" : "FALHOU");

                console.log("8 - fim do fluxo (primeira mensagem), respondendo 200");
                return res.sendStatus(200);
            }

            console.log("9 - ja havia AguardandoNomeWhatsapp, validando com o Gemini se o texto e um nome");
            const validacao = await validarNome(texto);

            if (!validacao.eh_nome) {
                console.log("9b - texto nao parece ser um nome, enviando pedido de nome novamente");
                const enviou9b = await enviarMensagemWhatsapp(telefone, PERGUNTA_NOME_RETRY);
                console.log("9b2 - resultado do envio:", enviou9b ? "sucesso" : "FALHOU");

                console.log("9c - fim do fluxo (nome nao validado), respondendo 200");
                return res.sendStatus(200);
            }

            const nomeValidado = validacao.nome_extraido?.trim() || texto;

            console.log("10 - nome validado, criando Cliente e Atendimento (transacao)");
            const novoCliente = await prisma.$transaction(async (tx) => {
                const clienteCriado = await tx.cliente.create({
                    data: { nome: nomeValidado, telefone },
                });

                await tx.conversa.create({
                    data: { clienteId: clienteCriado.id, status: "aguardando" },
                });

                await tx.aguardandoNomeWhatsapp.delete({ where: { telefone } });

                return clienteCriado;
            });

            console.log("11 - enviando mensagem de confirmacao via WhatsApp");
            const enviou11 = await enviarMensagemWhatsapp(
                telefone,
                `Obrigado, ${novoCliente.nome}! Em breve um atendente vai falar com você.`
            );
            console.log("11b - resultado do envio:", enviou11 ? "sucesso" : "FALHOU");

            console.log("12 - fim do fluxo (cliente criado), respondendo 200");
            return res.sendStatus(200);
        }

        console.log("13 - cliente encontrado, buscando atendimento em aberto");
        let atendimento = await prisma.conversa.findFirst({
            where: { clienteId: cliente.id, status: { not: "fechado" } },
            orderBy: { criadoEm: "desc" },
        });

        if (!atendimento) {
            console.log("14 - nenhum atendimento em aberto, criando novo");
            atendimento = await prisma.conversa.create({
                data: { clienteId: cliente.id, status: "aguardando" },
            });
        }

        console.log("15 - registrando mensagem recebida na tabela Mensagem");
        await prisma.mensagem.create({
            data: {
                conversaId: atendimento.id,
                remetente: "cliente",
                conteudo: texto,
                status: "recebida",
            },
        });

        console.log("16 - fim do fluxo (cliente existente), respondendo 200");
        return res.sendStatus(200);
    } catch (error) {
        console.error("Erro no webhook do WhatsApp - objeto completo:", error);
        console.error("Erro no webhook do WhatsApp - stack:", error.stack);
        return res.sendStatus(200);
    }
}

module.exports = {
    verificarWebhook,
    receberWebhook,
    enviarMensagemWhatsapp,
    gerarPerguntaDeNome,
    validarNome,
};
