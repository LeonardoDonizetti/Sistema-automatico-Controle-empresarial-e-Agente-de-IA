require("dotenv").config();

const app = require("./app");
const prisma = require("./config/prisma");

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await prisma.$queryRaw`SELECT 1`;

        console.log("Banco de dados conectado.");

        app.listen(PORT, () => {
            console.log(`Servidor rodando em http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error("Erro ao conectar ao banco de dados.");
        console.error(error.message);

        process.exit(1);
    }
}

startServer();