const { z } = require("zod");

const prisma = require("../config/prisma");

const criarClienteSchema = z.object({
    nome: z.string().trim().min(1).max(150),
    telefone: z.string().trim().min(8).max(20),
});

const atualizarClienteSchema = z
    .object({
        nome: z.string().trim().min(1).max(150).optional(),
        telefone: z.string().trim().min(8).max(20).optional(),
    })
    .refine((dados) => Object.keys(dados).length > 0, {
        message: "Nenhum campo válido para atualizar.",
    });

function parseId(valor) {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
}

async function listarClientes(req, res) {
    try {
        const clientes = await prisma.cliente.findMany({
            orderBy: { nome: "asc" },
        });

        return res.json({ clientes });
    } catch (error) {
        console.error("Erro ao listar clientes:", error.message);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

async function criarCliente(req, res) {
    try {
        const resultado = criarClienteSchema.safeParse(req.body);

        if (!resultado.success) {
            return res.status(400).json({ erro: "Dados inválidos." });
        }

        const { nome, telefone } = resultado.data;

        const existente = await prisma.cliente.findUnique({
            where: { telefone },
        });

        if (existente) {
            return res.status(409).json({ erro: "Já existe um cliente com esse telefone." });
        }

        const cliente = await prisma.cliente.create({
            data: { nome, telefone },
        });

        return res.status(201).json({ cliente });
    } catch (error) {
        console.error("Erro ao criar cliente:", error.message);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

async function buscarCliente(req, res) {
    try {
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({ erro: "ID inválido." });
        }

        const cliente = await prisma.cliente.findUnique({ where: { id } });

        if (!cliente) {
            return res.status(404).json({ erro: "Cliente não encontrado." });
        }

        return res.json({ cliente });
    } catch (error) {
        console.error("Erro ao buscar cliente:", error.message);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

async function atualizarCliente(req, res) {
    try {
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({ erro: "ID inválido." });
        }

        const resultado = atualizarClienteSchema.safeParse(req.body);

        if (!resultado.success) {
            return res.status(400).json({ erro: "Dados inválidos." });
        }

        const dados = resultado.data;

        const clienteExistente = await prisma.cliente.findUnique({ where: { id } });

        if (!clienteExistente) {
            return res.status(404).json({ erro: "Cliente não encontrado." });
        }

        if (dados.telefone && dados.telefone !== clienteExistente.telefone) {
            const telefoneEmUso = await prisma.cliente.findUnique({
                where: { telefone: dados.telefone },
            });

            if (telefoneEmUso) {
                return res.status(409).json({ erro: "Já existe um cliente com esse telefone." });
            }
        }

        const cliente = await prisma.cliente.update({
            where: { id },
            data: dados,
        });

        return res.json({ cliente });
    } catch (error) {
        console.error("Erro ao atualizar cliente:", error.message);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

module.exports = {
    listarClientes,
    criarCliente,
    buscarCliente,
    atualizarCliente,
};