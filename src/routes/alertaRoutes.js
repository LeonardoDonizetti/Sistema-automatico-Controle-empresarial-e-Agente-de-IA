const express = require("express");

const autenticar = require("../middleware/authMiddleware");
const { listarAlertas } = require("../controllers/alertaController");

const router = express.Router();

router.use(autenticar);

router.get("/", listarAlertas);

module.exports = router;