const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");
const clienteRoutes = require("./routes/clienteRoutes");
const atendimentoRoutes = require("./routes/atendimentoRoutes");
const alertaRoutes = require("./routes/alertaRoutes");
const pedidoRoutes = require("./routes/pedidoRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();

// Não informa que estamos usando Express
app.disable("x-powered-by");

// Headers básicos de segurança
app.use(helmet());

// CORS para desenvolvimento local
app.use(
    cors({
        origin: ["http://localhost:3000", "http://localhost:5173"],
        credentials: true,
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
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/clientes", clienteRoutes);
app.use("/api/atendimentos", atendimentoRoutes);
app.use("/api/alertas", alertaRoutes);
app.use("/api/pedidos", pedidoRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Rota de teste
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
    });
});

// Middleware de erro central: captura qualquer erro não tratado
// (inclusive corpo de requisição malformado) e nunca vaza detalhe interno.
app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    console.error("Erro não tratado:", err.message);

    return res.status(500).json({ erro: "Erro interno do servidor." });
});

module.exports = app;