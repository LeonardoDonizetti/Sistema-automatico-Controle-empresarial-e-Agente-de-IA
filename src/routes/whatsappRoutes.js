const express = require("express");

const { verificarWebhook, receberWebhook } = require("../controllers/whatsappController");

const router = express.Router();

router.get("/webhook", verificarWebhook);
router.post("/webhook", receberWebhook);

module.exports = router;
