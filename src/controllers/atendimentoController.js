const { z } = require("zod");

const prisma = require("../config/prisma");
const { parsePaginacao, metaPaginacao } = require("../utils/paginacao");

const STATUS_VALIDOS = ["aguardando", "em_atendimento", "resolvido", "fechado"];

const TRANSICOES_PERMITIDAS = {
    aguardando: ["em_atendimento"],
    em_atendimento: ["resolvido"],
    resolvido: ["fechado", "em_atendimento"],
    fechado: [],
};

const criarAtendimentoSchema = z.object({
    clienteId: z.number().int().positive(),
    setor: z.string().trim().min(1).max(100).optional(),
});

const atualizarAtendimentoSchema = z
    .object({
        status: z.enum(STATUS_VALIDOS).optional(),
        setor: z.string().trim().min(1).max(100).optional(),
        atendenteId: z.number().int().positive().nullable().optional(),
    })
    .refine((dados) => Object.keys(dados).length > 0, {
        message: "Nenhum campo válido para atualizar.",
    });

function parseId(valor) {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
}

async function registrarHistorico(tx, atendimentoId, usuarioId, tipo, descricao) {
    await tx.historicoAtendimento.create({
        data: {
            atendimentoId,
            usuarioId,
            tipo,
            descricao,
        },
    });
}

async function listarAtendimentos(req, res) {
    try {
        const { status, atendenteId, clienteId, setor } = req.query;

        const where = {};

        if (setor) {
            if (typeof setor !== "string" || setor.length > 100) {
                return res.status(400).json({ erro: "setor inválido para filtro." });
            }
            where.setor = setor;
        }

        if (status) {
            if (!STATUS_VALIDOS.includes(status)) {
                return res.status(400).json({ erro: "Status inválido para filtro." });
            }
            where.status = status;
        }

        if (atendenteId) {
            const id = parseId(atendenteId);
            if (!id) {
                return res.status(400).json({ erro: "atendenteId inválido." });
            }
            where.atendenteId = id;
        }

        if (clienteId) {
            const id = parseId(clienteId);
            if (!id) {
                return res.status(400).json({ erro: "clienteId inválido." });
            }
            where.clienteId = id;
        }

        const { pagina, porPagina, skip, take } = parsePaginacao(req.query);

        const [atendimentos, total] = await Promise.all([
            prisma.conversa.findMany({
                where,
                orderBy: { criadoEm: "desc" },
                include: {
                    cliente: { select: { id: true, nome: true, telefone: true } },
                    atendente: { select: { id: true, nome: true } },
                },
                skip,
                take,
            }),
            prisma.conversa.count({ where }),
        ]);

        return res.json({
            atendimentos,
            paginacao: metaPaginacao(total, pagina, porPagina),
        });
    } catch (error) {
        console.error("Erro ao listar atendimentos:", error.message);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

async function criarAtendimento(req, res) {
    try {
        const resultado = criarAtendimentoSchema.safeParse(req.body);

        if (!resultado.success) {
            return res.status(400).json({ erro: "Dados inválidos." });
        }

        const { clienteId, setor } = resultado.data;

        const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });

        if (!cliente) {
            return res.status(404).json({ erro: "Cliente não encontrado." });
        }

        const atendimento = await prisma.$transaction(async (tx) => {
            const novo = await tx.conversa.create({
                data: {
                    clienteId,
                    setor: setor || null,
                    status: "aguardando",
                },
            });

            await registrarHistorico(
                tx,
                novo.id,
                Number(req.usuario.sub),
                "criacao",
                "Atendimento criado e adicionado à fila de espera."
            );

            return tx.conversa.findUnique({
                where: { id: novo.id },
                include: {
                    cliente: { select: { id: true, nome: true, telefone: true } },
                    atendente: { select: { id: true, nome: true } },
                },
            });
        });

        return res.status(201).json({ atendimento });
    } catch (error) {
        console.error("Erro ao criar atendimento:", error.message);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

async function buscarAtendimento(req, res) {
    try {
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({ erro: "ID inválido." });
        }

        const atendimento = await prisma.conversa.findUnique({
            where: { id },
            include: {
                cliente: { select: { id: true, nome: true, telefone: true } },
                atendente: { select: { id: true, nome: true } },
                mensagens: { orderBy: { criadoEm: "asc" } },
                historico: {
                    orderBy: { criadoEm: "asc" },
                    include: {
                        usuario: { select: { id: true, nome: true } },
                    },
                },
            },
        });

        if (!atendimento) {
            return res.status(404).json({ erro: "Atendimento não encontrado." });
        }

        return res.json({ atendimento });
    } catch (error) {
        console.error("Erro ao buscar atendimento:", error.message);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

async function atualizarAtendimento(req, res) {
    try {
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({ erro: "ID inválido." });
        }

        const resultado = atualizarAtendimentoSchema.safeParse(req.body);

        if (!resultado.success) {
            return res.status(400).json({ erro: resultado.error.issues[0]?.message || "Dados inválidos." });
        }

        const dados = resultado.data;

        const atendimentoExistente = await prisma.conversa.findUnique({ where: { id } });

        if (!atendimentoExistente) {
            return res.status(404).json({ erro: "Atendimento não encontrado." });
        }

        if (dados.status) {
            const transicoesPermitidas = TRANSICOES_PERMITIDAS[atendimentoExistente.status];

            if (!transicoesPermitidas.includes(dados.status)) {
                return res.status(400).json({
                    erro: `Não é possível mudar de "${atendimentoExistente.status}" para "${dados.status}".`,
                });
            }
        }

        const alterandoAtendente = Object.prototype.hasOwnProperty.call(dados, "atendenteId");

        if (alterandoAtendente) {
            const ehAdmin = req.usuario.cargo === "admin";
            const ehResponsavelAtual = atendimentoExistente.atendenteId === Number(req.usuario.sub);

            if (!ehAdmin && !ehResponsavelAtual) {
                return res.status(403).json({
                    erro: "Apenas o admin ou o atendente responsável atual podem transferir ou desatribuir este atendimento.",
                });
            }
        }

        let nomeNovoAtendente = null;

        if (dados.atendenteId) {
            const atendente = await prisma.usuario.findUnique({ where: { id: dados.atendenteId } });

            if (!atendente || !atendente.ativo) {
                return res.status(400).json({ erro: "Atendente inválido ou inativo." });
            }

            nomeNovoAtendente = atendente.nome;
        }

        const usuarioId = Number(req.usuario.sub);

        const atendimento = await prisma.$transaction(async (tx) => {
            const atualizado = await tx.conversa.update({
                where: { id },
                data: dados,
            });

            if (dados.status) {
                await registrarHistorico(
                    tx,
                    id,
                    usuarioId,
                    "status_alterado",
                    `Status alterado de "${atendimentoExistente.status}" para "${dados.status}".`
                );
            }

            if (dados.setor && dados.setor !== atendimentoExistente.setor) {
                await registrarHistorico(
                    tx,
                    id,
                    usuarioId,
                    "setor_alterado",
                    `Setor alterado de "${atendimentoExistente.setor || "nenhum"}" para "${dados.setor}".`
                );
            }

            if (dados.atendenteId !== undefined && dados.atendenteId !== atendimentoExistente.atendenteId) {
                const descricao =
                    dados.atendenteId === null
                        ? "Atendimento removido do responsável e devolvido à fila."
                        : `Atendimento transferido para ${nomeNovoAtendente}.`;

                await registrarHistorico(tx, id, usuarioId, "atendente_alterado", descricao);
            }

            return tx.conversa.findUnique({
                where: { id },
                include: {
                    cliente: { select: { id: true, nome: true, telefone: true } },
                    atendente: { select: { id: true, nome: true } },
                },
            });
        });

        return res.json({ atendimento });
    } catch (error) {
        console.error("Erro ao atualizar atendimento:", error.message);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

async function assumirAtendimento(req, res) {
    try {
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({ erro: "ID inválido." });
        }

        const atendimentoExistente = await prisma.conversa.findUnique({ where: { id } });

        if (!atendimentoExistente) {
            return res.status(404).json({ erro: "Atendimento não encontrado." });
        }

        if (atendimentoExistente.atendenteId) {
            return res.status(409).json({ erro: "Este atendimento já possui um responsável." });
        }

        const usuarioId = Number(req.usuario.sub);

        const atendimento = await prisma.$transaction(async (tx) => {
            await tx.conversa.update({
                where: { id },
                data: {
                    atendenteId: usuarioId,
                    status: "em_atendimento",
                },
            });

            await registrarHistorico(
                tx,
                id,
                usuarioId,
                "atendimento_assumido",
                "Atendimento assumido da fila de espera."
            );

            return tx.conversa.findUnique({
                where: { id },
                include: {
                    cliente: { select: { id: true, nome: true, telefone: true } },
                    atendente: { select: { id: true, nome: true } },
                },
            });
        });

        return res.json({ atendimento });
    } catch (error) {
        console.error("Erro ao assumir atendimento:", error.message);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

module.exports = {
    listarAtendimentos,
    criarAtendimento,
    buscarAtendimento,
    atualizarAtendimento,
    assumirAtendimento,
};