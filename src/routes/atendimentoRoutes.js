const express = require("express");

const autenticar = require("../middleware/authMiddleware");
const {
    listarAtendimentos,
    criarAtendimento,
    buscarAtendimento,
    atualizarAtendimento,
    assumirAtendimento,
} = require("../controllers/atendimentoController");
const {
    listarMensagens,
    criarMensagem,
} = require("../controllers/mensagemController");

const router = express.Router();

router.use(autenticar);

router.get("/", listarAtendimentos);
router.post("/", criarAtendimento);
router.get("/:id", buscarAtendimento);
router.patch("/:id", atualizarAtendimento);
router.post("/:id/assumir", assumirAtendimento);
router.get("/:id/mensagens", listarMensagens);
router.post("/:id/mensagens", criarMensagem);

module.exports = router;