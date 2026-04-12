const express = require("express");
const router = express.Router();
const { Matricula } = require("../models"); // Importa desde models/index.js

/**
 * @swagger
 * tags:
 *   - name: Matriculas
 *     description: Endpoints para gestión de matrículas (inscripciones)
 */

/**
 * @swagger
 * /api/matriculas:
 *   get:
 *     summary: Obtener todas las matrículas
 *     tags: [Matriculas]
 *     responses:
 *       200:
 *         description: Lista de matrículas
 */
router.get("/", async (req, res) => {
  try {
    const matriculas = await Matricula.findAll();
    res.json(matriculas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/matriculas/{id}:
 *   get:
 *     summary: Obtener una matrícula por ID
 *     tags: [Matriculas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/:id", async (req, res) => {
  try {
    const matricula = await Matricula.findByPk(req.params.id);
    if (!matricula) return res.status(404).json({ message: "Matrícula no encontrada" });
    res.json(matricula);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/matriculas:
 *   post:
 *     summary: Crear una matrícula
 *     tags: [Matriculas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estudianteDni:
 *                 type: string
 *               comisionId:
 *                 type: string
 *               fechaInscripcion:
 *                 type: string
 *                 format: date
 */
router.post("/", async (req, res) => {
  try {
    const matricula = await Matricula.create(req.body);
    res.status(201).json(matricula);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/matriculas/{id}:
 *   put:
 *     summary: Actualizar una matrícula
 *     tags: [Matriculas]
 */
router.put("/:id", async (req, res) => {
  try {
    const [updated] = await Matricula.update(req.body, { where: { matriculaId: req.params.id } });
    if (!updated) return res.status(404).json({ message: "Matrícula no encontrada" });
    res.json({ message: "Matrícula actualizada" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/matriculas/{id}:
 *   delete:
 *     summary: Eliminar una matrícula
 *     tags: [Matriculas]
 */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Matricula.destroy({ where: { matriculaId: req.params.id } });
    if (!deleted) return res.status(404).json({ message: "Matrícula no encontrada" });
    res.json({ message: "Matrícula eliminada" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;