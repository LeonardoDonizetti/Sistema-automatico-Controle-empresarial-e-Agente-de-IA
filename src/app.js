const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");

const app = express();

// Não informa que estamos usando Express
app.disable("x-powered-by");

// Headers básicos de segurança
app.use(helmet());

// CORS para desenvolvimento local
app.use(
    cors({
        origin: "http://localhost:3000",
    })
);

// Limita o tamanho do JSON recebido
app.use(
    express.json({
        limit: "10kb",
    })
);

// Limita requisições para evitar abuso
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
});

app.use(limiter);

// Rotas de autenticação
app.use("/api/auth", authRoutes);

// Rota de teste
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
    });
});

module.exports = app;