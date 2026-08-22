const express = require("express");

const autenticar = require("../middleware/authMiddleware");
const {
    listarPedidos,
    criarPedido,
    buscarPedido,
    atualizarPedido,
    adicionarItem,
    removerItem,
} = require("../controllers/pedidoController");

const router = express.Router();

router.use(autenticar);

router.get("/", listarPedidos);
router.post("/", criarPedido);
router.get("/:id", buscarPedido);
router.patch("/:id", atualizarPedido);
router.post("/:id/itens", adicionarItem);
router.delete("/:id/itens/:itemId", removerItem);

module.exports = router;