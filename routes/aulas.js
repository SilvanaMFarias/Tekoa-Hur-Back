const express = require("express");
const router = express.Router();
const aulaController = require("../controllers/aulaController");
const { Aula, Edificio } = require("../models");
const validateRequiredFields = require("../middleware/requiredFields");
const validateForeignKey = require("../middleware/foreignKeyValidation");

/**
 * @swagger
 * tags:
 *   - name: Aulas
 *     description: Endpoints para gestión de aulas
 */

/**
 * @swagger
 * /api/aulas:
 *   get:
 *     summary: Obtener todas las aulas
 *     tags: [Aulas]
 */
router.get("/", aulaController.getAll);

/**
 * @swagger
 * /api/aulas/{id}:
 *   get:
 *     summary: Obtener un aula por ID
 *     tags: [Aulas]
 */
router.get("/:id", aulaController.getById);

/**
 * @swagger
 * /api/aulas:
 *   post:
 *     summary: Crear un aula
 *     tags: [Aulas]
 */
router.post("/", 
  validateRequiredFields(['edificioId']),
  validateForeignKey(Edificio, 'edificioId', 'edificioId'),
  aulaController.create
);

/**
 * @swagger
 * /api/aulas/{id}:
 *   put:
 *     summary: Actualizar un aula
 *     tags: [Aulas]
 */
router.put("/:id", 
  validateForeignKey(Edificio, 'edificioId', 'edificioId'),
  aulaController.update
);

/**
 * @swagger
 * /api/aulas/{id}:
 *   delete:
 *     summary: Eliminar un aula
 *     tags: [Aulas]
 */
router.delete("/:id", aulaController.delete);

module.exports = router;