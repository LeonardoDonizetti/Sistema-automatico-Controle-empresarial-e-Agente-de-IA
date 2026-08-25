const argon2 = require("argon2");
const { z } = require("zod");

const prisma = require("../config/prisma");
const { parsePaginacao, metaPaginacao } = require("../utils/paginacao");

const CARGOS_VALIDOS = ["admin", "atendente"];

const criarUsuarioSchema = z.object({
    nome: z.string().trim().min(1).max(150),
    email: z.string().email().max(254),
    senha: z.string().min(12).max(128),
    cargo: z.enum(CARGOS_VALIDOS),
});

const atualizarUsuarioSchema = z.object({
    nome: z.string().trim().min(1).max(150).optional(),
    senha: z.string().min(12).max(128).optional(),
    cargo: z.enum(CARGOS_VALIDOS).optional(),
    ativo: z.boolean().optional(),
});

function usuarioPublico(usuario) {
    return {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        cargo: usuario.cargo,
        ativo: usuario.ativo,
        criadoEm: usuario.criadoEm,
        atualizadoEm: usuario.atualizadoEm,
    };
}

function parseId(valor) {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
}

async function listarUsuarios(req, res) {
    try {
        const { pagina, porPagina, skip, take } = parsePaginacao(req.query);

        const [usuarios, total] = await Promise.all([
            prisma.usuario.findMany({
                orderBy: { nome: "asc" },
                skip,
                take,
            }),
            prisma.usuario.count(),
        ]);

        return res.json({
            usuarios: usuarios.map(usuarioPublico),
            paginacao: metaPaginacao(total, pagina, porPagina),
        });
    } catch (error) {
        console.error("Erro ao listar usuários:", error.message);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

async function criarUsuario(req, res) {
    try {
        const resultado = criarUsuarioSchema.safeParse(req.body);

        if (!resultado.success) {
            return res.status(400).json({ erro: "Dados inválidos." });
        }

        const { nome, email, senha, cargo } = resultado.data;
        const emailNormalizado = email.trim().toLowerCase();

        const existente = await prisma.usuario.findUnique({
            where: { email: emailNormalizado },
        });

        if (existente) {
            return res.status(409).json({ erro: "Já existe um usuário com esse e-mail." });
        }

        const senhaHash = await argon2.hash(senha, { type: argon2.argon2id });

        const usuario = await prisma.usuario.create({
            data: {
                nome,
                email: emailNormalizado,
                senhaHash,
                cargo,
                ativo: true,
            },
        });

        return res.status(201).json({ usuario: usuarioPublico(usuario) });
    } catch (error) {
        console.error("Erro ao criar usuário:", error.message);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

async function buscarUsuario(req, res) {
    try {
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({ erro: "ID inválido." });
        }

        const souDono = String(req.usuario.sub) === String(id);
        const souAdmin = req.usuario.cargo === "admin";

        if (!souAdmin && !souDono) {
            return res.status(403).json({ erro: "Você não tem permissão para acessar este recurso." });
        }

        const usuario = await prisma.usuario.findUnique({ where: { id } });

        if (!usuario) {
            return res.status(404).json({ erro: "Usuário não encontrado." });
        }

        return res.json({ usuario: usuarioPublico(usuario) });
    } catch (error) {
        console.error("Erro ao buscar usuário:", error.message);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

async function atualizarUsuario(req, res) {
    try {
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({ erro: "ID inválido." });
        }

        const souDono = String(req.usuario.sub) === String(id);
        const souAdmin = req.usuario.cargo === "admin";

        if (!souAdmin && !souDono) {
            return res.status(403).json({ erro: "Você não tem permissão para acessar este recurso." });
        }

        const resultado = atualizarUsuarioSchema.safeParse(req.body);

        if (!resultado.success) {
            return res.status(400).json({ erro: "Dados inválidos." });
        }

        const dados = resultado.data;

        // Quem não é admin não pode alterar cargo nem ativo, nem em si mesmo.
        if (!souAdmin) {
            delete dados.cargo;
            delete dados.ativo;
        }

        if (Object.keys(dados).length === 0) {
            return res.status(400).json({ erro: "Nenhum campo válido para atualizar." });
        }

        const dadosAtualizacao = { ...dados };

        if (dados.senha) {
            dadosAtualizacao.senhaHash = await argon2.hash(dados.senha, {
                type: argon2.argon2id,
            });
            delete dadosAtualizacao.senha;
        }

        const usuarioExistente = await prisma.usuario.findUnique({ where: { id } });

        if (!usuarioExistente) {
            return res.status(404).json({ erro: "Usuário não encontrado." });
        }

        const usuario = await prisma.usuario.update({
            where: { id },
            data: dadosAtualizacao,
        });

        return res.json({ usuario: usuarioPublico(usuario) });
    } catch (error) {
        console.error("Erro ao atualizar usuário:", error.message);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

async function inativarUsuario(req, res) {
    try {
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({ erro: "ID inválido." });
        }

        if (String(req.usuario.sub) === String(id)) {
            return res.status(400).json({ erro: "Você não pode inativar o próprio usuário." });
        }

        const usuarioExistente = await prisma.usuario.findUnique({ where: { id } });

        if (!usuarioExistente) {
            return res.status(404).json({ erro: "Usuário não encontrado." });
        }

        await prisma.usuario.update({
            where: { id },
            data: { ativo: false },
        });

        return res.status(204).send();
    } catch (error) {
        console.error("Erro ao inativar usuário:", error.message);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

module.exports = {
    listarUsuarios,
    criarUsuario,
    buscarUsuario,
    atualizarUsuario,
    inativarUsuario,
};