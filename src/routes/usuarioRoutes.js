const express = require("express");

const autenticar = require("../middleware/authMiddleware");
const exigirCargo = require("../middleware/exigirCargo");
const {
    listarUsuarios,
    criarUsuario,
    buscarUsuario,
    atualizarUsuario,
    inativarUsuario,
} = require("../controllers/usuarioController");

const router = express.Router();

router.use(autenticar);

router.get("/", exigirCargo("admin"), listarUsuarios);
router.post("/", exigirCargo("admin"), criarUsuario);
router.get("/:id", buscarUsuario);
router.patch("/:id", atualizarUsuario);
router.delete("/:id", exigirCargo("admin"), inativarUsuario);

module.exports = router;