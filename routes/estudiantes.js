// routes/estudiantes.js
const express = require("express");
const router = express.Router();
const estudianteController = require("../controllers/estudianteController");
const asyncHandler = require("../middleware/asyncHandler");
const validateRequiredFields = require("../middleware/requiredFields");

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
router.get("/", asyncHandler(estudianteController.getAll));

/**
 * @swagger
 * /api/estudiantes/{id}:
 *   get:
 *     summary: Obtener un estudiante por ID
 *     tags: [Estudiantes]
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/:id", asyncHandler(estudianteController.getById));

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
router.post("/", 
  validateRequiredFields(['dni', 'nombre_apellido']),
  estudianteController.create
);

/**
 * @swagger
 * /api/estudiantes/{id}:
 *   put:
 *     summary: Actualizar un estudiante
 *     tags: [Estudiantes]
 */
router.put("/:id", asyncHandler(estudianteController.update));

/**
 * @swagger
 * /api/estudiantes/{id}:
 *   delete:
 *     summary: Eliminar un estudiante
 *     tags: [Estudiantes]
 */
router.delete("/:id", asyncHandler(estudianteController.delete));

module.exports = router;