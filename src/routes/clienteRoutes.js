const express = require("express");

const autenticar = require("../middleware/authMiddleware");
const {
    listarClientes,
    criarCliente,
    buscarCliente,
    atualizarCliente,
} = require("../controllers/clienteController");

const router = express.Router();

router.use(autenticar);

router.get("/", listarClientes);
router.post("/", criarCliente);
router.get("/:id", buscarCliente);
router.patch("/:id", atualizarCliente);

module.exports = router;