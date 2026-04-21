const express = require("express");
const router = express.Router();
const { Comision } = require("../models"); // Importa desde models/index.js

/**
 * @swagger
 * tags:
 *   - name: Comisiones
 *     description: Endpoints para gestión de comisiones
 */

/**
 * @swagger
 * /api/comisiones:
 *   get:
 *     summary: Obtener todas las comisiones
 *     tags: [Comisiones]
 *     responses:
 *       200:
 *         description: Lista de comisiones
 */
router.get("/", async (req, res) => {
  try {
    const comisiones = await Comision.findAll();
    res.json(comisiones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/comisiones/{id}:
 *   get:
 *     summary: Obtener una comisión por ID
 *     tags: [Comisiones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/:id", async (req, res) => {
  try {
    const comision = await Comision.findByPk(req.params.id);
    if (!comision) return res.status(404).json({ message: "Comisión no encontrada" });
    res.json(comision);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/comisiones:
 *   post:
 *     summary: Crear una comisión
 *     tags: [Comisiones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cod_comision:
 *                 type: string
 *               materiaId:
 *                 type: string
 *               profesorId:
 *                 type: string
 */
router.post("/", async (req, res) => {
  try {
    const comision = await Comision.create(req.body);
    res.status(201).json(comision);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/comisiones/{id}:
 *   put:
 *     summary: Actualizar una comisión
 *     tags: [Comisiones]
 */
router.put("/:id", async (req, res) => {
  try {
    const [updated] = await Comision.update(req.body, { where: { comisionId: req.params.id } });
    if (!updated) return res.status(404).json({ message: "Comisión no encontrada" });
    res.json({ message: "Comisión actualizada" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/comisiones/{id}:
 *   delete:
 *     summary: Eliminar una comisión
 *     tags: [Comisiones]
 */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Comision.destroy({ where: { comisionId: req.params.id } });
    if (!deleted) return res.status(404).json({ message: "Comisión no encontrada" });
    res.json({ message: "Comisión eliminada" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;