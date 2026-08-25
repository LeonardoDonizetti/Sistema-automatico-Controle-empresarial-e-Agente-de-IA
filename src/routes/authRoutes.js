const express = require("express");

const { login } = require("../controllers/authController");
const autenticar = require("../middleware/authMiddleware");
const loginRateLimiter = require("../middleware/loginRateLimiter");

const router = express.Router();

router.post("/login", loginRateLimiter, login);

router.get("/me", autenticar, (req, res) => {
    res.json({
        usuario: req.usuario,
    });
});

module.exports = router;