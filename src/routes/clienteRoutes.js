const express = require("express");

const autenticar = require("../middleware/authMiddleware");
const exigirCargo = require("../middleware/exigirCargo");
const {
    listarClientes,
    criarCliente,
    buscarCliente,
    atualizarCliente,
    excluirCliente,
} = require("../controllers/clienteController");

const router = express.Router();

router.use(autenticar);

router.get("/", listarClientes);
router.post("/", criarCliente);
router.get("/:id", buscarCliente);
router.patch("/:id", atualizarCliente);
router.delete("/:id", exigirCargo("admin"), excluirCliente);

module.exports = router;