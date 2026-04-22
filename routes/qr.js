// routes/qr.js
const express = require("express");
const router = express.Router();
const qrController = require("../controllers/qrController");
const asyncHandler = require("../middleware/asyncHandler");
const validateRequiredFields = require("../middleware/requiredFields");

/**
 * @swagger
 * tags:
 *   - name: QR
 *     description: Endpoints para gestión de códigos QR
 */

/**
 * @swagger
 * /api/qr/generar:
 *   post:
 *     summary: Generar un código QR con token
 *     tags: [QR]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - edificioId
 *               - aulaId
 *               - fechaInicio
 *               - fechaFin
 *             properties:
 *               edificioId:
 *                 type: string
 *               aulaId:
 *                 type: string
 *               fechaInicio:
 *                 type: string
 *                 format: date-time
 *               fechaFin:
 *                 type: string
 *                 format: date-time
 */
router.post("/generar",
  validateRequiredFields(['edificioId', 'aulaId', 'fechaInicio', 'fechaFin']),
  asyncHandler(qrController.generar)
);

/**
 * @swagger
 * /api/qr/validar:
 *   get:
 *     summary: Validar un código QR
 *     tags: [QR]
 *     parameters:
 *       - in: query
 *         name: edificioId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: aulaId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: rtoken
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: fechaInicio
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: fechaFin
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 */
router.get("/validar", asyncHandler(qrController.validar));

module.exports = router;