const express = require("express");
const router = express.Router();
const { Profesor } = require("../models");
const profesorController = require("../controllers/profesorController");
const asyncHandler = require("../middleware/asyncHandler");
const validateRequiredFields = require("../middleware/requiredFields");

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
 */
router.get("/", asyncHandler(profesorController.getAll));

/**
 * @swagger
 * /api/profesores/{id}:
 *   get:
 *     summary: Obtener un profesor por ID
 *     tags: [Profesores]
 */
router.get("/:id", asyncHandler(profesorController.getById));

/**
 * @swagger
 * /api/profesores:
 *   post:
 *     summary: Crear un profesor
 *     tags: [Profesores]
 */
router.post("/", 
  validateRequiredFields(['dni', 'nombre_apellido', 'email']),
  profesorController.create
);

/**
 * @swagger
 * /api/profesores/{id}:
 *   put:
 *     summary: Actualizar un profesor
 *     tags: [Profesores]
 */
router.put("/:id", asyncHandler(profesorController.update));

/**
 * @swagger
 * /api/profesores/{id}:
 *   delete:
 *     summary: Eliminar un profesor
 *     tags: [Profesores]
 */
router.delete("/:id", asyncHandler(profesorController.delete));

module.exports = router;