const rateLimit = require("express-rate-limit");

// Limite mais rígido específico para tentativas de login (força bruta)
const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { erro: "Muitas tentativas de login. Tente novamente mais tarde." },
    // TEMPORÁRIO: log de diagnóstico para investigar por que o rate limit
    // dedicado do login não está bloqueando em produção. Remover depois do teste.
    keyGenerator: (req) => {
        console.log("[loginRateLimiter] IP identificado:", req.ip);
        return req.ip;
    },
});

module.exports = loginRateLimiter;
