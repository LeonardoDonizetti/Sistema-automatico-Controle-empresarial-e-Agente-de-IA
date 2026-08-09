require("dotenv").config();

const readline = require("readline");
const argon2 = require("argon2");
const prisma = require("../src/config/prisma");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function perguntar(pergunta) {
    return new Promise((resolve) => {
        rl.question(pergunta, resolve);
    });
}

async function main() {
    const nome = await perguntar("Nome do administrador: ");
    const email = await perguntar("E-mail do administrador: ");
    const senha = await perguntar("Senha do administrador: ");

    if (!nome.trim() || !email.trim() || !senha) {
        throw new Error("Nome, e-mail e senha são obrigatórios.");
    }

    if (senha.length < 12) {
        throw new Error("A senha precisa ter pelo menos 12 caracteres.");
    }

    const emailNormalizado = email.trim().toLowerCase();

    const usuarioExistente = await prisma.usuario.findUnique({
        where: {
            email: emailNormalizado,
        },
    });

    if (usuarioExistente) {
        throw new Error("Já existe um usuário com esse e-mail.");
    }

    const senhaHash = await argon2.hash(senha, {
        type: argon2.argon2id,
    });

    await prisma.usuario.create({
        data: {
            nome: nome.trim(),
            email: emailNormalizado,
            senhaHash,
            cargo: "admin",
            ativo: true,
        },
    });

    console.log("Administrador criado com sucesso.");
}

main()
    .catch((error) => {
        console.error("Erro:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        rl.close();
        await prisma.$disconnect();
    });