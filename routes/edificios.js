const express = require("express");
const router = express.Router();
const { Edificio } = require("../models"); // Importa desde index.js de models

/**
 * @swagger
 * tags:
 *   - name: Edificios
 *     description: Endpoints para gestión de edificios
 */

/**
 * @swagger
 * /api/edificios:
 *   get:
 *     summary: Obtener todos los edificios
 *     tags: [Edificios]
 *     responses:
 *       200:
 *         description: Lista de edificios
 */
router.get("/", async (req, res) => {
  try {
    const edificios = await Edificio.findAll();
    res.json(edificios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/edificios/{id}:
 *   get:
 *     summary: Obtener un edificio por ID
 *     tags: [Edificios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/:id", async (req, res) => {
  try {
    const edificio = await Edificio.findByPk(req.params.id);
    if (!edificio) return res.status(404).json({ message: "Edificio no encontrado" });
    res.json(edificio);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/edificios:
 *   post:
 *     summary: Crear un edificio
 *     tags: [Edificios]
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
    const edificio = await Edificio.create(req.body);
    res.status(201).json(edificio);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/edificios/{id}:
 *   put:
 *     summary: Actualizar un edificio
 *     tags: [Edificios]
 */
router.put("/:id", async (req, res) => {
  try {
    const [updated] = await Edificio.update(req.body, { where: { edificioId: req.params.id } });
    if (!updated) return res.status(404).json({ message: "Edificio no encontrado" });
    res.json({ message: "Edificio actualizado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/edificios/{id}:
 *   delete:
 *     summary: Eliminar un edificio
 *     tags: [Edificios]
 */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Edificio.destroy({ where: { edificioId: req.params.id } });
    if (!deleted) return res.status(404).json({ message: "Edificio no encontrado" });
    res.json({ message: "Edificio eliminado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;