const { z } = require("zod");

const prisma = require("../config/prisma");

const REMETENTES_VALIDOS = ["atendente", "cliente", "sistema"];

const criarMensagemSchema = z.object({
    remetente: z.enum(REMETENTES_VALIDOS),
    conteudo: z.string().trim().min(1).max(2000),
});

function parseId(valor) {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
}

async function listarMensagens(req, res) {
    try {
        const atendimentoId = parseId(req.params.id);

        if (!atendimentoId) {
            return res.status(400).json({ erro: "ID de atendimento inválido." });
        }

        const atendimento = await prisma.conversa.findUnique({ where: { id: atendimentoId } });

        if (!atendimento) {
            return res.status(404).json({ erro: "Atendimento não encontrado." });
        }

        const mensagens = await prisma.mensagem.findMany({
            where: { conversaId: atendimentoId },
            orderBy: { criadoEm: "asc" },
        });

        return res.json({ mensagens });
    } catch (error) {
        console.error("Erro ao listar mensagens:", error.message);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

async function criarMensagem(req, res) {
    try {
        const atendimentoId = parseId(req.params.id);

        if (!atendimentoId) {
            return res.status(400).json({ erro: "ID de atendimento inválido." });
        }

        const resultado = criarMensagemSchema.safeParse(req.body);

        if (!resultado.success) {
            return res.status(400).json({ erro: "Dados inválidos." });
        }

        const { remetente, conteudo } = resultado.data;

        const atendimento = await prisma.conversa.findUnique({ where: { id: atendimentoId } });

        if (!atendimento) {
            return res.status(404).json({ erro: "Atendimento não encontrado." });
        }

        if (atendimento.status === "fechado") {
            return res.status(400).json({ erro: "Não é possível enviar mensagens em um atendimento fechado." });
        }

        const status = remetente === "cliente" ? "recebida" : "enviada";

        const mensagem = await prisma.$transaction(async (tx) => {
            const nova = await tx.mensagem.create({
                data: {
                    conversaId: atendimentoId,
                    remetente,
                    conteudo,
                    status,
                },
            });

            await tx.historicoAtendimento.create({
                data: {
                    atendimentoId,
                    usuarioId: Number(req.usuario.sub),
                    tipo: "mensagem_registrada",
                    descricao: `Nova mensagem registrada (remetente: ${remetente}).`,
                },
            });

            return nova;
        });

        return res.status(201).json({ mensagem });
    } catch (error) {
        console.error("Erro ao criar mensagem:", error.message);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

module.exports = {
    listarMensagens,
    criarMensagem,
};