const express = require("express");
const router = express.Router();
const { Horario, Comision, Aula } = require("../models"); // Importa desde models/index.js

/**
 * @swagger
 * tags:
 *   - name: Horarios
 *     description: Endpoints para gestión de horarios
 */

/**
 * @swagger
 * /api/horarios:
 *   get:
 *     summary: Obtener todos los horarios
 *     tags: [Horarios]
 *     responses:
 *       200:
 *         description: Lista de horarios
 */
router.get("/", async (req, res) => {
  try {
    const horarios = await Horario.findAll({
      include: [
        { model: Comision, as: "comision" },
        { model: Aula, as: "aula" }
      ]
    });
    res.json(horarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/horarios/{id}:
 *   get:
 *     summary: Obtener un horario por ID
 *     tags: [Horarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/:id", async (req, res) => {
  try {
    const horario = await Horario.findByPk(req.params.id, {
      include: [
        { model: Comision, as: "comision" },
        { model: Aula, as: "aula" }
      ]
    });
    if (!horario) return res.status(404).json({ message: "Horario no encontrado" });
    res.json(horario);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/horarios:
 *   post:
 *     summary: Crear un horario
 *     tags: [Horarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               diaSemana:
 *                 type: string
 *               horaDesde:
 *                 type: string
 *                 format: time
 *               horaHasta:
 *                 type: string
 *                 format: time
 *               periodicidad:
 *                 type: string
 *               comisionId:
 *                 type: string
 *               aulaId:
 *                 type: string
 */
router.post("/", async (req, res) => {
  try {
    const horario = await Horario.create(req.body);
    res.status(201).json(horario);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/horarios/{id}:
 *   put:
 *     summary: Actualizar un horario
 *     tags: [Horarios]
 */
router.put("/:id", async (req, res) => {
  try {
    const [updated] = await Horario.update(req.body, { where: { horarioId: req.params.id } });
    if (!updated) return res.status(404).json({ message: "Horario no encontrado" });
    res.json({ message: "Horario actualizado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/horarios/{id}:
 *   delete:
 *     summary: Eliminar un horario
 *     tags: [Horarios]
 */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Horario.destroy({ where: { horarioId: req.params.id } });
    if (!deleted) return res.status(404).json({ message: "Horario no encontrado" });
    res.json({ message: "Horario eliminado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;