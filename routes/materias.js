const express = require("express");
const router = express.Router();
const { Materia } = require("../models"); // Importa desde models/index.js

/**
 * @swagger
 * tags:
 *   - name: Materias
 *     description: Endpoints para gestión de materias
 */

/**
 * @swagger
 * /api/materias:
 *   get:
 *     summary: Obtener todas las materias
 *     tags: [Materias]
 *     responses:
 *       200:
 *         description: Lista de materias
 */
router.get("/", async (req, res) => {
  try {
    const materias = await Materia.findAll();
    res.json(materias);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/materias/{id}:
 *   get:
 *     summary: Obtener una materia por ID
 *     tags: [Materias]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           forma: uuid
 *     responses:
 *       200:
 *          description: Materia encontrada
 */
router.get("/:id", async (req, res) => {
  try {
    const materia = await Materia.findByPk(req.params.id);
    if (!materia) return res.status(404).json({ message: "Materia no encontrada" });
    res.json(materia);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/materias:
 *   post:
 *     summary: Crear una materia
 *     tags: [Materias]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 */
router.post("/", async (req, res) => {
  try {
    const materia = await Materia.create(req.body);
    res.status(201).json(materia);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/materias/{id}:
 *   put:
 *     summary: Actualizar una materia por ID
 *     tags: [Materias]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           forma: uuid
 *     responses:
 *       200:
 *          description: Materia Actualizada
 */
router.put("/:id", async (req, res) => {
  try {
    const [updated] = await Materia.update(req.body, { where: { materiaId: req.params.id } });
    if (!updated) return res.status(404).json({ message: "Materia no encontrada" });
    res.json({ message: "Materia actualizada" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/materias/{id}:
 *   delete:
 *     summary: Eliminar una materia
 *     tags: [Materias]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Materia eliminada
 *       404:
 *         description: Materia no encontrada
 */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Materia.destroy({ where: { materiaId: req.params.id } });
    if (!deleted) return res.status(404).json({ message: "Materia no encontrada" });
    res.json({ message: "Materia eliminada" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;