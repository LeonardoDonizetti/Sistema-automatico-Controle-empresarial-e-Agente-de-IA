const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = rateLimit;

// Limite mais rígido específico para tentativas de login (força bruta)
const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { erro: "Muitas tentativas de login. Tente novamente mais tarde." },
    // TEMPORÁRIO: log de diagnóstico para investigar rate limit inconsistente
    // em produção. Remover depois do teste.
    keyGenerator: (req) => {
        console.log("[loginRateLimiter] diagnostico:", {
            reqIp: req.ip,
            xForwardedFor: req.headers["x-forwarded-for"],
            socketRemoteAddress: req.socket.remoteAddress,
        });
        return ipKeyGenerator(req.ip);
    },
});

module.exports = loginRateLimiter;
