const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = rateLimit;

// No Railway o X-Forwarded-For chega com 2 IPs (ex: "cliente, hop interno").
// O primeiro (mais à esquerda) é o IP real do cliente; o segundo é um hop
// interno instável da infraestrutura, que muda a cada requisição. Por isso
// extraímos o primeiro explicitamente em vez de depender da resolução
// automática de req.ip via trust proxy.
function primeiroIp(req) {
    const xForwardedFor = req.headers["x-forwarded-for"];

    if (xForwardedFor) {
        return xForwardedFor.split(",")[0].trim();
    }

    return req.ip;
}

// Limite mais rígido específico para tentativas de login (força bruta)
const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { erro: "Muitas tentativas de login. Tente novamente mais tarde." },
    keyGenerator: (req) => ipKeyGenerator(primeiroIp(req)),
});

module.exports = loginRateLimiter;
