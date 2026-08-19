const prisma = require("../config/prisma");

function minutosParaMs(minutos) {
    return minutos * 60 * 1000;
}

async function listarAlertas(req, res) {
    try {
        const minutosSemResponsavel = Number(process.env.ALERTA_SEM_RESPONSAVEL_MINUTOS) || 30;
        const minutosClienteAguardando = Number(process.env.ALERTA_CLIENTE_AGUARDANDO_MINUTOS) || 30;

        const agora = new Date();
        const limiteSemResponsavel = new Date(agora.getTime() - minutosParaMs(minutosSemResponsavel));
        const limiteClienteAguardando = new Date(agora.getTime() - minutosParaMs(minutosClienteAguardando));

        const semResponsavel = await prisma.conversa.findMany({
            where: {
                status: "aguardando",
                atendenteId: null,
                criadoEm: { lte: limiteSemResponsavel },
            },
            include: {
                cliente: { select: { id: true, nome: true, telefone: true } },
            },
            orderBy: { criadoEm: "asc" },
        });

        const emAtendimento = await prisma.conversa.findMany({
            where: { status: "em_atendimento" },
            include: {
                cliente: { select: { id: true, nome: true, telefone: true } },
                atendente: { select: { id: true, nome: true } },
                mensagens: {
                    orderBy: { criadoEm: "desc" },
                    take: 1,
                },
            },
        });

        const clienteAguardando = emAtendimento.filter((atendimento) => {
            const ultimaMensagem = atendimento.mensagens[0];

            if (!ultimaMensagem || ultimaMensagem.remetente !== "cliente") {
                return false;
            }

            return ultimaMensagem.criadoEm <= limiteClienteAguardando;
        });

        return res.json({
            alertas: {
                semResponsavel: semResponsavel.map((atendimento) => ({
                    atendimentoId: atendimento.id,
                    cliente: atendimento.cliente,
                    minutosNaFila: Math.round((agora - atendimento.criadoEm) / 60000),
                })),
                clienteAguardando: clienteAguardando.map((atendimento) => ({
                    atendimentoId: atendimento.id,
                    cliente: atendimento.cliente,
                    atendente: atendimento.atendente,
                    minutosSemResposta: Math.round(
                        (agora - atendimento.mensagens[0].criadoEm) / 60000
                    ),
                })),
            },
        });
    } catch (error) {
        console.error("Erro ao listar alertas:", error.message);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

module.exports = { listarAlertas };