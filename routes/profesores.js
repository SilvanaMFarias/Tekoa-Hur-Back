const express = require("express");
const router = express.Router();
const { Profesor } = require("../models"); // Importa desde models/index.js

/**
 * @swagger
 * tags:
 *   - name: Profesores
 *     description: Endpoints para gestión de profesores
 */

/**
 * @swagger
 * /api/profesores:
 *   get:
 *     summary: Obtener todos los profesores
 *     tags: [Profesores]
 *     responses:
 *       200:
 *         description: Lista de profesores
 */
router.get("/", async (req, res) => {
  try {
    const profesores = await Profesor.findAll();
    res.json(profesores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/profesores/{id}:
 *   get:
 *     summary: Obtener un profesor por ID
 *     tags: [Profesores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/:id", async (req, res) => {
  try {
    const profesor = await Profesor.findByPk(req.params.id);
    if (!profesor) return res.status(404).json({ message: "Profesor no encontrado" });
    res.json(profesor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/profesores:
 *   post:
 *     summary: Crear un profesor
 *     tags: [Profesores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dni:
 *                 type: string
 *               nombre_apellido:
 *                 type: string
 *               email:
 *                 type: string
 */
router.post("/", async (req, res) => {
  try {
    const profesor = await Profesor.create(req.body);
    res.status(201).json(profesor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/profesores/{id}:
 *   put:
 *     summary: Actualizar un profesor
 *     tags: [Profesores]
 */
router.put("/:id", async (req, res) => {
  try {
    const [updated] = await Profesor.update(req.body, { where: { profesorId: req.params.id } });
    if (!updated) return res.status(404).json({ message: "Profesor no encontrado" });
    res.json({ message: "Profesor actualizado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/profesores/{id}:
 *   delete:
 *     summary: Eliminar un profesor
 *     tags: [Profesores]
 */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Profesor.destroy({ where: { profesorId: req.params.id } });
    if (!deleted) return res.status(404).json({ message: "Profesor no encontrado" });
    res.json({ message: "Profesor eliminado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;