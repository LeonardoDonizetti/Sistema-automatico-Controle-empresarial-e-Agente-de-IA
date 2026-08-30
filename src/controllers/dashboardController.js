const prisma = require("../config/prisma");

async function metricas(req, res) {
    try {
        const [porStatus, totalAtendimentos] = await Promise.all([
            prisma.conversa.groupBy({
                by: ["status"],
                _count: { _all: true },
            }),
            prisma.conversa.count(),
        ]);

        const contagemPorStatus = {
            aguardando: 0,
            em_atendimento: 0,
            resolvido: 0,
            fechado: 0,
        };

        porStatus.forEach((item) => {
            contagemPorStatus[item.status] = item._count._all;
        });

        const porAtendente = await prisma.conversa.groupBy({
            by: ["atendenteId"],
            _count: { _all: true },
            where: { atendenteId: { not: null } },
        });

        const idsAtendentes = porAtendente.map((item) => item.atendenteId);
        const atendentes = await prisma.usuario.findMany({
            where: { id: { in: idsAtendentes } },
            select: { id: true, nome: true },
        });

        const atendimentosPorFuncionario = porAtendente.map((item) => {
            const atendente = atendentes.find((a) => a.id === item.atendenteId);
            return {
                atendenteId: item.atendenteId,
                nome: atendente ? atendente.nome : "Desconhecido",
                total: item._count._all,
            };
        });

        const resolvidos = await prisma.conversa.findMany({
            where: { status: { in: ["resolvido", "fechado"] } },
            select: { criadoEm: true, atualizadoEm: true },
        });

        let tempoMedioAtendimentoMinutos = null;

        if (resolvidos.length > 0) {
            const totalMinutos = resolvidos.reduce((soma, atendimento) => {
                const diffMs = atendimento.atualizadoEm - atendimento.criadoEm;
                return soma + diffMs / 60000;
            }, 0);

            tempoMedioAtendimentoMinutos = Math.round(totalMinutos / resolvidos.length);
        }

        return res.json({
            totalAtendimentos,
            porStatus: contagemPorStatus,
            atendimentosPorFuncionario,
            tempoMedioAtendimentoMinutos,
        });
    } catch (error) {
        console.error("Erro ao calcular métricas:", error.message);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

async function volumePorPeriodo(req, res) {
    try {
        const { dataInicio, dataFim } = req.query;

        if (!dataInicio || !dataFim) {
            return res.status(400).json({ erro: "Informe dataInicio e dataFim (formato AAAA-MM-DD)." });
        }

        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);

        if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
            return res.status(400).json({ erro: "Datas inválidas." });
        }

        const umAnoAposInicio = new Date(inicio);
        umAnoAposInicio.setFullYear(umAnoAposInicio.getFullYear() + 1);

        if (fim > umAnoAposInicio) {
            return res.status(400).json({
                erro: "O intervalo entre dataInicio e dataFim não pode ser maior que 1 ano.",
            });
        }

        fim.setHours(23, 59, 59, 999);

        const atendimentos = await prisma.conversa.findMany({
            where: {
                criadoEm: { gte: inicio, lte: fim },
            },
            select: { criadoEm: true },
        });

        const contagemPorDia = {};

        atendimentos.forEach((atendimento) => {
            const dia = atendimento.criadoEm.toISOString().slice(0, 10);
            contagemPorDia[dia] = (contagemPorDia[dia] || 0) + 1;
        });

        return res.json({
            periodo: { dataInicio, dataFim },
            total: atendimentos.length,
            porDia: contagemPorDia,
        });
    } catch (error) {
        console.error("Erro ao calcular volume por período:", error.message);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

module.exports = { metricas, volumePorPeriodo };