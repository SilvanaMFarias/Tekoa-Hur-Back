// routes/profesores.js
const express = require("express");
const router = express.Router();
const profesorController = require("../controllers/profesorController");

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
router.get("/", profesorController.getAll);

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
router.get("/:id", profesorController.getById);

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
router.post("/", profesorController.create);

/**
 * @swagger
 * /api/profesores/{id}:
 *   put:
 *     summary: Actualizar un profesor
 *     tags: [Profesores]
 */
router.put("/:id", profesorController.update);

/**
 * @swagger
 * /api/profesores/{id}:
 *   delete:
 *     summary: Eliminar un profesor
 *     tags: [Profesores]
 */
router.delete("/:id", profesorController.delete);

// Rutas extra con lógica específica
router.get("/dni/:dni", profesorController.getByDni);
router.get("/nombre/:nombre", profesorController.getByNombre);

module.exports = router;