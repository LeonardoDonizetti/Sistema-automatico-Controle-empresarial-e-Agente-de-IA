const express = require("express");

const { login } = require("../controllers/authController");
const autenticar = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/login", login);

router.get("/me", autenticar, (req, res) => {
    res.json({
        usuario: req.usuario,
    });
});

module.exports = router;