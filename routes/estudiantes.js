const express = require("express");
const router = express.Router();
const { Estudiante } = require("../models"); // Importa desde models/index.js

/**
 * @swagger
 * tags:
 *   - name: Estudiantes
 *     description: Endpoints para gestión de estudiantes
 */

/**
 * @swagger
 * /api/estudiantes:
 *   get:
 *     summary: Obtener todos los estudiantes
 *     tags: [Estudiantes]
 *     responses:
 *       200:
 *         description: Lista de estudiantes
 */
router.get("/", async (req, res) => {
  try {
    const estudiantes = await Estudiante.findAll();
    res.json(estudiantes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/estudiantes/{dni}:
 *   get:
 *     summary: Obtener un estudiante por DNI
 *     tags: [Estudiantes]
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/:dni", async (req, res) => {
  try {
    const estudiante = await Estudiante.findByPk(req.params.dni);
    if (!estudiante) return res.status(404).json({ message: "Estudiante no encontrado" });
    res.json(estudiante);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/estudiantes:
 *   post:
 *     summary: Crear un estudiante
 *     tags: [Estudiantes]
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
 */
router.post("/", async (req, res) => {
  try {
    const estudiante = await Estudiante.create(req.body);
    res.status(201).json(estudiante);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/estudiantes/{dni}:
 *   put:
 *     summary: Actualizar un estudiante
 *     tags: [Estudiantes]
 */
router.put("/:dni", async (req, res) => {
  try {
    const [updated] = await Estudiante.update(req.body, { where: { dni: req.params.dni } });
    if (!updated) return res.status(404).json({ message: "Estudiante no encontrado" });
    res.json({ message: "Estudiante actualizado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/estudiantes/{dni}:
 *   delete:
 *     summary: Eliminar un estudiante
 *     tags: [Estudiantes]
 */
router.delete("/:dni", async (req, res) => {
  try {
    const deleted = await Estudiante.destroy({ where: { dni: req.params.dni } });
    if (!deleted) return res.status(404).json({ message: "Estudiante no encontrado" });
    res.json({ message: "Estudiante eliminado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;