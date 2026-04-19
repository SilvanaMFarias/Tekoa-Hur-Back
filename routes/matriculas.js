const express = require("express");
const router = express.Router();
const { Matricula, Estudiante, Comision } = require("../models");
const matriculaController = require("../controllers/matriculaController");
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
 */
router.get("/", matriculaController.getAll);

/**
 * @swagger
 * /api/matriculas/{id}:
 *   get:
 *     summary: Obtener una matrícula por ID
 *     tags: [Matriculas]
 */
router.get("/:id", matriculaController.getById);

/**
 * @swagger
 * /api/matriculas:
 *   post:
 *     summary: Crear una matrícula
 *     tags: [Matriculas]
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
router.delete("/:id", matriculaController.delete);

module.exports = router;