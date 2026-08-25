const express = require("express");

const autenticar = require("../middleware/authMiddleware");
const exigirCargo = require("../middleware/exigirCargo");
const { metricas, volumePorPeriodo } = require("../controllers/dashboardController");

const router = express.Router();

router.use(autenticar);

router.get("/metricas", exigirCargo("admin"), metricas);
router.get("/volume", exigirCargo("admin"), volumePorPeriodo);

module.exports = router;