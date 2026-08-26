const { z } = require("zod");

const prisma = require("../config/prisma");
const { parsePaginacao, metaPaginacao } = require("../utils/paginacao");

const STATUS_VALIDOS = [
    "orcamento",
    "aguardando_aprovacao",
    "aprovado",
    "em_producao",
    "pronto",
    "entregue",
];

const TRANSICOES_PERMITIDAS = {
    orcamento: ["aguardando_aprovacao"],
    aguardando_aprovacao: ["aprovado", "orcamento"],
    aprovado: ["em_producao"],
    em_producao: ["pronto"],
    pronto: ["entregue"],
    entregue: [],
};

const itemSchema = z.object({
    descricao: z.string().trim().min(1).max(200),
    quantidade: z.number().int().positive(),
    precoUnitario: z.number().positive(),
});

const criarPedidoSchema = z.object({
    atendimentoId: z.number().int().positive(),
    observacoes: z.string().trim().max(1000).optional(),
    itens: z.array(itemSchema).min(1, "O pedido precisa ter pelo menos um item."),
});

const atualizarPedidoSchema = z
    .object({
        status: z.enum(STATUS_VALIDOS).optional(),
        observacoes: z.string().trim().max(1000).optional(),
    })
    .refine((dados) => Object.keys(dados).length > 0, {
        message: "Nenhum campo válido para atualizar.",
    });

function parseId(valor) {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function paraCentavos(valorReais) {
    return Math.round(valorReais * 100);
}

function calcularValorTotal(itens) {
    return itens.reduce((total, item) => total + item.quantidade * item.precoUnitarioCentavos, 0);
}

function formatarPedido(pedido) {
    return {
        id: pedido.id,
        atendimentoId: pedido.atendimentoId,
        clienteId: pedido.clienteId,
        status: pedido.status,
        observacoes: pedido.observacoes,
        criadoEm: pedido.criadoEm,
        atualizadoEm: pedido.atualizadoEm,
        itens: pedido.itens.map((item) => ({
            id: item.id,
            descricao: item.descricao,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitarioCentavos / 100,
            subtotal: (item.quantidade * item.precoUnitarioCentavos) / 100,
        })),
        valorTotal: calcularValorTotal(pedido.itens) / 100,
    };
}

async function listarPedidos(req, res) {
    try {
        const { status, clienteId, atendimentoId } = req.query;

        const where = {};

        if (status) {
            const statusList = status.split(",").map((s) => s.trim()).filter(Boolean);

            if (statusList.length === 0 || !statusList.every((s) => STATUS_VALIDOS.includes(s))) {
                return res.status(400).json({ erro: "Status inválido para filtro." });
            }

            where.status = statusList.length === 1 ? statusList[0] : { in: statusList };
        }

        if (clienteId) {
            const id = parseId(clienteId);
            if (!id) {
                return res.status(400).json({ erro: "clienteId inválido." });
            }
            where.clienteId = id;
        }

        if (atendimentoId) {
            const id = parseId(atendimentoId);
            if (!id) {
                return res.status(400).json({ erro: "atendimentoId inválido." });
            }
            where.atendimentoId = id;
        }

        const { pagina, porPagina, skip, take } = parsePaginacao(req.query);

        const [pedidos, total] = await Promise.all([
            prisma.pedido.findMany({
                where,
                orderBy: { criadoEm: "desc" },
                include: { itens: true },
                skip,
                take,
            }),
            prisma.pedido.count({ where }),
        ]);

        return res.json({
            pedidos: pedidos.map(formatarPedido),
            paginacao: metaPaginacao(total, pagina, porPagina),
        });
    } catch (error) {
        console.error("Erro ao listar pedidos:", error.message);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

async function criarPedido(req, res) {
    try {
        const resultado = criarPedidoSchema.safeParse(req.body);

        if (!resultado.success) {
            return res.status(400).json({ erro: resultado.error.issues[0]?.message || "Dados inválidos." });
        }

        const { atendimentoId, observacoes, itens } = resultado.data;

        const atendimento = await prisma.conversa.findUnique({ where: { id: atendimentoId } });

        if (!atendimento) {
            return res.status(404).json({ erro: "Atendimento não encontrado." });
        }

        const pedido = await prisma.pedido.create({
            data: {
                atendimentoId,
                clienteId: atendimento.clienteId,
                observacoes: observacoes || null,
                itens: {
                    create: itens.map((item) => ({
                        descricao: item.descricao,
                        quantidade: item.quantidade,
                        precoUnitarioCentavos: paraCentavos(item.precoUnitario),
                    })),
                },
            },
            include: { itens: true },
        });

        return res.status(201).json({ pedido: formatarPedido(pedido) });
    } catch (error) {
        console.error("Erro ao criar pedido:", error.message);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

async function buscarPedido(req, res) {
    try {
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({ erro: "ID inválido." });
        }

        const pedido = await prisma.pedido.findUnique({
            where: { id },
            include: { itens: true },
        });

        if (!pedido) {
            return res.status(404).json({ erro: "Pedido não encontrado." });
        }

        return res.json({ pedido: formatarPedido(pedido) });
    } catch (error) {
        console.error("Erro ao buscar pedido:", error.message);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

async function atualizarPedido(req, res) {
    try {
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({ erro: "ID inválido." });
        }

        const resultado = atualizarPedidoSchema.safeParse(req.body);

        if (!resultado.success) {
            return res.status(400).json({ erro: resultado.error.issues[0]?.message || "Dados inválidos." });
        }

        const dados = resultado.data;

        const pedidoExistente = await prisma.pedido.findUnique({ where: { id } });

        if (!pedidoExistente) {
            return res.status(404).json({ erro: "Pedido não encontrado." });
        }

        if (dados.status) {
            const transicoesPermitidas = TRANSICOES_PERMITIDAS[pedidoExistente.status];

            if (!transicoesPermitidas.includes(dados.status)) {
                return res.status(400).json({
                    erro: `Não é possível mudar de "${pedidoExistente.status}" para "${dados.status}".`,
                });
            }
        }

        const pedido = await prisma.pedido.update({
            where: { id },
            data: dados,
            include: { itens: true },
        });

        return res.json({ pedido: formatarPedido(pedido) });
    } catch (error) {
        console.error("Erro ao atualizar pedido:", error.message);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

async function adicionarItem(req, res) {
    try {
        const pedidoId = parseId(req.params.id);

        if (!pedidoId) {
            return res.status(400).json({ erro: "ID de pedido inválido." });
        }

        const resultado = itemSchema.safeParse(req.body);

        if (!resultado.success) {
            return res.status(400).json({ erro: "Dados de item inválidos." });
        }

        const pedidoExistente = await prisma.pedido.findUnique({ where: { id: pedidoId } });

        if (!pedidoExistente) {
            return res.status(404).json({ erro: "Pedido não encontrado." });
        }

        const { descricao, quantidade, precoUnitario } = resultado.data;

        await prisma.itemPedido.create({
            data: {
                pedidoId,
                descricao,
                quantidade,
                precoUnitarioCentavos: paraCentavos(precoUnitario),
            },
        });

        const pedido = await prisma.pedido.findUnique({
            where: { id: pedidoId },
            include: { itens: true },
        });

        return res.status(201).json({ pedido: formatarPedido(pedido) });
    } catch (error) {
        console.error("Erro ao adicionar item:", error.message);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

async function removerItem(req, res) {
    try {
        const pedidoId = parseId(req.params.id);
        const itemId = parseId(req.params.itemId);

        if (!pedidoId || !itemId) {
            return res.status(400).json({ erro: "ID inválido." });
        }

        const pedidoExistente = await prisma.pedido.findUnique({
            where: { id: pedidoId },
            include: { itens: true },
        });

        if (!pedidoExistente) {
            return res.status(404).json({ erro: "Pedido não encontrado." });
        }

        const item = pedidoExistente.itens.find((i) => i.id === itemId);

        if (!item) {
            return res.status(404).json({ erro: "Item não encontrado neste pedido." });
        }

        if (pedidoExistente.itens.length === 1) {
            return res.status(400).json({ erro: "O pedido precisa ter pelo menos um item." });
        }

        await prisma.itemPedido.delete({ where: { id: itemId } });

        const pedido = await prisma.pedido.findUnique({
            where: { id: pedidoId },
            include: { itens: true },
        });

        return res.json({ pedido: formatarPedido(pedido) });
    } catch (error) {
        console.error("Erro ao remover item:", error.message);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

module.exports = {
    listarPedidos,
    criarPedido,
    buscarPedido,
    atualizarPedido,
    adicionarItem,
    removerItem,
};