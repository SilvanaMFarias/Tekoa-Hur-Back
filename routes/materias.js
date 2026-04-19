const express = require("express");
const router = express.Router();
const { Materia } = require("../models");
const materiaController = require("../controllers/materiaController");
const asyncHandler = require("../middleware/asyncHandler");
const validateRequiredFields = require("../middleware/requiredFields");

/**
 * @swagger
 * tags:
 *   - name: Materias
 *     description: Endpoints para gestión de materias
 */

/**
 * @swagger
 * /api/materias:
 *   get:
 *     summary: Obtener todas las materias
 *     tags: [Materias]
 */
router.get("/", asyncHandler(materiaController.getAll));

/**
 * @swagger
 * /api/materias/{id}:
 *   get:
 *     summary: Obtener una materia por ID
 *     tags: [Materias]
 */
router.get("/:id", asyncHandler(materiaController.getById));

/**
 * @swagger
 * /api/materias:
 *   post:
 *     summary: Crear una materia
 *     tags: [Materias]
 */
router.post("/", 
  validateRequiredFields(['nombre']),
  materiaController.create
);

/**
 * @swagger
 * /api/materias/{id}:
 *   put:
 *     summary: Actualizar una materia
 *     tags: [Materias]
 */
router.put("/:id", asyncHandler(materiaController.update));

/**
 * @swagger
 * /api/materias/{id}:
 *   delete:
 *     summary: Eliminar una materia
 *     tags: [Materias]
 */
router.delete("/:id", asyncHandler(materiaController.delete));

module.exports = router;