const express = require("express");

const autenticar = require("../middleware/authMiddleware");
const { metricas, volumePorPeriodo } = require("../controllers/dashboardController");

const router = express.Router();

router.use(autenticar);

router.get("/metricas", metricas);
router.get("/volume", volumePorPeriodo);

module.exports = router;