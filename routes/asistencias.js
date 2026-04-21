const express = require("express");
const router = express.Router();
const { Asistencia, Comision } = require("../models"); // Importa desde models/index.js

/**
 * @swagger
 * tags:
 *   - name: Asistencias
 *     description: Endpoints para gestión de asistencias
 */

/**
 * @swagger
 * /api/asistencias:
 *   get:
 *     summary: Obtener todas las asistencias
 *     tags: [Asistencias]
 *     responses:
 *       200:
 *         description: Lista de asistencias
 */
router.get("/", async (req, res) => {
  try {
    const asistencias = await Asistencia.findAll({
      include: [{ model: Comision, as: "comision" }]
    });
    res.json(asistencias);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/asistencias/{id}:
 *   get:
 *     summary: Obtener una asistencia por ID
 *     tags: [Asistencias]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/:id", async (req, res) => {
  try {
    const asistencia = await Asistencia.findByPk(req.params.id, {
      include: [{ model: Comision, as: "comision" }]
    });
    if (!asistencia) return res.status(404).json({ message: "Asistencia no encontrada" });
    res.json(asistencia);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/asistencias:
 *   post:
 *     summary: Registrar una asistencia
 *     tags: [Asistencias]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fecha:
 *                 type: string
 *                 format: date
 *               horaRegistro:
 *                 type: string
 *                 format: time
 *               tipoUsuario:
 *                 type: string
 *                 enum: [ESTUDIANTE, PROFESOR]
 *               usuarioId:
 *                 type: string
 *               estado:
 *                 type: string
 *                 enum: [PRESENTE, AUSENTE, TARDE, JUSTIFICADO]
 *               comisionId:
 *                 type: string
 */
router.post("/", async (req, res) => {
  try {
    const asistencia = await Asistencia.create(req.body);
    res.status(201).json(asistencia);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/asistencias/{id}:
 *   put:
 *     summary: Actualizar una asistencia
 *     tags: [Asistencias]
 */
router.put("/:id", async (req, res) => {
  try {
    const [updated] = await Asistencia.update(req.body, { where: { asistenciaId: req.params.id } });
    if (!updated) return res.status(404).json({ message: "Asistencia no encontrada" });
    res.json({ message: "Asistencia actualizada" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/asistencias/{id}:
 *   delete:
 *     summary: Eliminar una asistencia
 *     tags: [Asistencias]
 */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Asistencia.destroy({ where: { asistenciaId: req.params.id } });
    if (!deleted) return res.status(404).json({ message: "Asistencia no encontrada" });
    res.json({ message: "Asistencia eliminada" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;