const express = require("express");
const router = express.Router();
const { Asistencia, Comision, Estudiante } = require("../models");
const asistenciaController = require("../controllers/asistenciaController");
const asyncHandler = require("../middleware/asyncHandler");
const validateRequiredFields = require("../middleware/requiredFields");
const validateForeignKey = require("../middleware/foreignKeyValidation");

/**
 * @swagger
 * tags:
 *   - name: Asistencias
 *     description: Endpoints para gestión de asistencias
 */

/**
 * @swagger
 * /api/asistencias:
 *   get:
 *     summary: Obtener todas las asistencias
 *     tags: [Asistencias]
 */
router.get("/", asyncHandler(asistenciaController.getAll));

/**
 * @swagger
 * /api/asistencias/{id}:
 *   get:
 *     summary: Obtener una asistencia por ID
 *     tags: [Asistencias]
 */
router.get("/:id", asyncHandler(asistenciaController.getById));

/**
 * @swagger
 * /api/asistencias:
 *   post:
 *     summary: Registrar una asistencia
 *     tags: [Asistencias]
 */
router.post("/", 
  validateRequiredFields(['fecha', 'horaRegistro', 'tipoUsuario', 'usuarioId', 'estado', 'comisionId']),
  validateForeignKey(Estudiante, 'usuarioId', 'dni'),
  validateForeignKey(Comision, 'comisionId', 'comisionId'),
  asistenciaController.create
);

/**
 * @swagger
 * /api/asistencias/{id}:
 *   put:
 *     summary: Actualizar una asistencia
 *     tags: [Asistencias]
 */
router.put("/:id", 
  validateForeignKey(Estudiante, 'usuarioId', 'dni'),
  validateForeignKey(Comision, 'comisionId', 'comisionId'),
  asistenciaController.update
);

/**
 * @swagger
 * /api/asistencias/{id}:
 *   delete:
 *     summary: Eliminar una asistencia
 *     tags: [Asistencias]
 */
router.delete("/:id", asyncHandler(asistenciaController.delete));

module.exports = router;