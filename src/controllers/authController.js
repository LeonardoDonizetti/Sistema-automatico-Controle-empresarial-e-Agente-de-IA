const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const { z } = require("zod");

const prisma = require("../config/prisma");

const loginSchema = z.object({
    email: z.string().email().max(254),
    senha: z.string().min(1).max(128),
});

async function login(req, res) {
    try {
        const resultado = loginSchema.safeParse(req.body);

        if (!resultado.success) {
            return res.status(400).json({
                erro: "Dados de login inválidos.",
            });
        }

        const { email, senha } = resultado.data;

        const usuario = await prisma.usuario.findUnique({
            where: {
                email: email.trim().toLowerCase(),
            },
        });

        if (!usuario || !usuario.ativo) {
            return res.status(401).json({
                erro: "E-mail ou senha inválidos.",
            });
        }

        const senhaValida = await argon2.verify(
            usuario.senhaHash,
            senha
        );

        if (!senhaValida) {
            return res.status(401).json({
                erro: "E-mail ou senha inválidos.",
            });
        }

        const token = jwt.sign(
            {
                sub: String(usuario.id),
                cargo: usuario.cargo,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "15m",
                issuer: "sistema-atendimento",
                audience: "painel-atendimento",
            }
        );

        return res.json({
            mensagem: "Login realizado com sucesso.",
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                cargo: usuario.cargo,
            },
        });
    } catch (error) {
        console.error("Erro no login:", error.message);

        return res.status(500).json({
            erro: "Erro interno do servidor.",
        });
    }
}

module.exports = {
    login,
};