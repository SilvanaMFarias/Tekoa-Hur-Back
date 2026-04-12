const express = require("express");
const router = express.Router();
const { Aula } = require("../models"); // Importa desde models/index.js

/**
 * @swagger
 * tags:
 *   - name: Aulas
 *     description: Endpoints para gestión de aulas
 */

/**
 * @swagger
 * /api/aulas:
 *   get:
 *     summary: Obtener todas las aulas
 *     tags: [Aulas]
 *     responses:
 *       200:
 *         description: Lista de aulas
 */
router.get("/", async (req, res) => {
  try {
    const aulas = await Aula.findAll();
    res.json(aulas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/aulas/{id}:
 *   get:
 *     summary: Obtener un aula por ID
 *     tags: [Aulas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/:id", async (req, res) => {
  try {
    const aula = await Aula.findByPk(req.params.id);
    if (!aula) return res.status(404).json({ message: "Aula no encontrada" });
    res.json(aula);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/aulas:
 *   post:
 *     summary: Crear un aula
 *     tags: [Aulas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sector:
 *                 type: string
 *               numero:
 *                 type: string
 *               edificioId:
 *                 type: string
 */
router.post("/", async (req, res) => {
  try {
    const aula = await Aula.create(req.body);
    res.status(201).json(aula);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/aulas/{id}:
 *   put:
 *     summary: Actualizar un aula
 *     tags: [Aulas]
 */
router.put("/:id", async (req, res) => {
  try {
    const [updated] = await Aula.update(req.body, { where: { aulaId: req.params.id } });
    if (!updated) return res.status(404).json({ message: "Aula no encontrada" });
    res.json({ message: "Aula actualizada" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/aulas/{id}:
 *   delete:
 *     summary: Eliminar un aula
 *     tags: [Aulas]
 */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Aula.destroy({ where: { aulaId: req.params.id } });
    if (!deleted) return res.status(404).json({ message: "Aula no encontrada" });
    res.json({ message: "Aula eliminada" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;