const jwt = require("jsonwebtoken");

function autenticar(req, res, next) {
    try {
        const authorization = req.headers.authorization;

        if (!authorization) {
            return res.status(401).json({
                erro: "Token de autenticação não informado.",
            });
        }

        const partes = authorization.split(" ");

        if (partes.length !== 2 || partes[0] !== "Bearer") {
            return res.status(401).json({
                erro: "Formato de autenticação inválido.",
            });
        }

        const token = partes[1];

        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET,
            {
                issuer: "sistema-atendimento",
                audience: "painel-atendimento",
            }
        );

        req.usuario = payload;

        next();
    } catch (error) {
        return res.status(401).json({
            erro: "Token inválido ou expirado.",
        });
    }
}

module.exports = autenticar;