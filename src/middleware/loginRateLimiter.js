const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = rateLimit;

// Limite mais rígido específico para tentativas de login (força bruta)
const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { erro: "Muitas tentativas de login. Tente novamente mais tarde." },
    keyGenerator: (req) => ipKeyGenerator(req.ip),
});

module.exports = loginRateLimiter;
