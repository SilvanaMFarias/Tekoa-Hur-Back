// routes/qr.routes.js

const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { Aula } = require("../models");

router.post("/generar", async (req, res) => {
  try {
    const { aulaId } = req.body;

    if (!aulaId) {
      return res.status(400).json({ message: "aulaId es requerido" });
    }

    const aula = await Aula.findByPk(aulaId);

    if (!aula) {
      return res.status(404).json({ message: "Aula no encontrada" });
    }

    const rtoken = crypto.randomBytes(16).toString("hex");

    aula.rtoken = rtoken;
    await aula.save();

    return res.status(200).json({
      message: "QR generado",
      rtoken
    });

  } catch (error) {
    console.error("Error generar QR:", error);
    return res.status(500).json({ message: "Error interno" });
  }
});
router.get("/validar", async (req, res) => {
  try {
    const { edificioId, aulaId, rtoken } = req.query;

    const aula = await Aula.findOne({
      where: {
        aulaId,
        edificioId
      }
    });

    if (!aula || !aula.rtoken || aula.rtoken !== rtoken) {
      return res.status(403).json({
        ok: false,
        message: "QR inválido o expirado"
      });
    }

    return res.status(200).json({
      ok: true,
      message: "QR válido"
    });

  } catch (error) {
    console.error("Error validar QR:", error);
    return res.status(500).json({
      message: "Error interno"
    });
  }
});

module.exports = router;