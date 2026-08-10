function exigirCargo(...cargosPermitidos) {
    return function (req, res, next) {
        if (!req.usuario) {
            return res.status(401).json({
                erro: "Usuário não autenticado.",
            });
        }

        if (!cargosPermitidos.includes(req.usuario.cargo)) {
            return res.status(403).json({
                erro: "Você não tem permissão para acessar este recurso.",
            });
        }

        next();
    };
}

module.exports = exigirCargo;