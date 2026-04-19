const express = require("express");
const router = express.Router();
const { Horario, Comision, Aula } = require("../models");
const horarioController = require("../controllers/horarioController");
const validateRequiredFields = require("../middleware/requiredFields");
const validateForeignKey = require("../middleware/foreignKeyValidation");

/**
 * @swagger
 * tags:
 *   - name: Horarios
 *     description: Endpoints para gestión de horarios
 */

/**
 * @swagger
 * /api/horarios:
 *   get:
 *     summary: Obtener todos los horarios
 *     tags: [Horarios]
 */
router.get("/", horarioController.getAll);

/**
 * @swagger
 * /api/horarios/{id}:
 *   get:
 *     summary: Obtener un horario por ID
 *     tags: [Horarios]
 */
router.get("/:id", horarioController.getById);

/**
 * @swagger
 * /api/horarios:
 *   post:
 *     summary: Crear un horario
 *     tags: [Horarios]
 */
router.post("/", 
  validateRequiredFields(['diaSemana', 'horaDesde', 'horaHasta', 'periodicidad', 'comisionId', 'aulaId']),
  validateForeignKey(Comision, 'comisionId', 'comisionId'),
  validateForeignKey(Aula, 'aulaId', 'aulaId'),
  horarioController.create
);

/**
 * @swagger
 * /api/horarios/{id}:
 *   put:
 *     summary: Actualizar un horario
 *     tags: [Horarios]
 */
router.put("/:id", 
  validateForeignKey(Comision, 'comisionId', 'comisionId'),
  validateForeignKey(Aula, 'aulaId', 'aulaId'),
  horarioController.update
);

/**
 * @swagger
 * /api/horarios/{id}:
 *   delete:
 *     summary: Eliminar un horario
 *     tags: [Horarios]
 */
router.delete("/:id", horarioController.delete);

module.exports = router;