// routes/edificios.js
const express = require("express");
const router = express.Router();
const edificioController = require("../controllers/edificioController");

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
router.get("/", edificioController.getAll);

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
router.get("/:id", edificioController.getById);

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
router.post("/", edificioController.create);

/**
 * @swagger
 * /api/edificios/{id}:
 *   put:
 *     summary: Actualizar un edificio
 *     tags: [Edificios]
 */
router.put("/:id", edificioController.update);

/**
 * @swagger
 * /api/edificios/{id}:
 *   delete:
 *     summary: Eliminar un edificio
 *     tags: [Edificios]
 */
router.delete("/:id", edificioController.delete);

// Ruta extra con lógica específica
router.get("/nombre/:nombre", edificioController.getByNombre);

module.exports = router;