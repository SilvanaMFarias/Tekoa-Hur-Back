// routes/matriculas.js
const express = require("express");
const router = express.Router();
const matriculaController = require("../controllers/matriculaController");
const asyncHandler = require("../middleware/asyncHandler");
const validateRequiredFields = require("../middleware/requiredFields");
const validateForeignKey = require("../middleware/foreignKeyValidation");

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
router.get("/", asyncHandler(matriculaController.getAll));

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
router.get("/:id", asyncHandler(matriculaController.getById));

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
router.post("/", 
  validateRequiredFields(['estudianteDni', 'comisionId', 'fechaInscripcion']),
  validateForeignKey(Estudiante, 'estudianteDni', 'dni'),
  validateForeignKey(Comision, 'comisionId', 'comisionId'),
  matriculaController.create
);

/**
 * @swagger
 * /api/matriculas/{id}:
 *   put:
 *     summary: Actualizar una matrícula
 *     tags: [Matriculas]
 */
router.put("/:id", 
  validateForeignKey(Estudiante, 'estudianteDni', 'dni'),
  validateForeignKey(Comision, 'comisionId', 'comisionId'),
  matriculaController.update
);

/**
 * @swagger
 * /api/matriculas/{id}:
 *   delete:
 *     summary: Eliminar una matrícula
 *     tags: [Matriculas]
 */
router.delete("/:id", asyncHandler(matriculaController.delete));

module.exports = router;