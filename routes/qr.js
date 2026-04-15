const express = require("express");
const router = express.Router();
const { Qr } = require("../models");

/**
 * @swagger
 * tags:
 *   - name: QR
 *     description: Endpoints para gestión de códigos QR
 */

/**
 * @swagger
 * /api/qr:
 *   get:
 *     summary: Obtener todos los QR generados
 *     tags: [QR]
 */
router.get("/", async (req, res) => {
  try {
    const qr = await Qr.findAll();
    res.json(qr);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/qr/validar:
 *   get:
 *     summary: Validar un QR por edificio, aula y token
 *     tags: [QR]
 *     parameters:
 *       - in: query
 *         name: edificioId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: aulaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: rtoken
 *         required: true
 *         schema:
 *           type: integer
 */
router.get("/validar", async (req, res) => {
  try {
    const { edificioId, aulaId, rtoken } = req.query;

    if (!edificioId || !aulaId || !rtoken) {
      return res.status(400).json({
        message: "Faltan parámetros: edificioId, aulaId o rtoken"
      });
    }

    const ahora = new Date();

    const qr = await Qr.findOne({
      where: {
        edificioId,
        aulaId,
        rtoken
      }
    });

    if (!qr) {
      return res.status(404).json({
        valido: false,
        message: "No existe un QR con ese edificio, aula y token"
      });
    }

    if (ahora < qr.fecha_inicio) {
      return res.status(400).json({
        valido: false,
        message: "El QR todavía no está vigente"
      });
    }

    if (ahora > qr.fecha_fin) {
      return res.status(400).json({
        valido: false,
        message: "El QR está vencido"
      });
    }

    return res.json({
      valido: true,
      message: "QR válido",
      qr
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;