// routes/horarios.js
const express = require("express");
const router = express.Router();
const horarioController = require("../controllers/horarioController");
const asyncHandler = require("../middleware/asyncHandler");
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
 *     responses:
 *       200:
 *         description: Lista de horarios
 */
router.get("/", asyncHandler(horarioController.getAll));

/**
 * @swagger
 * /api/horarios/{id}:
 *   get:
 *     summary: Obtener un horario por ID
 *     tags: [Horarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/:id", asyncHandler(horarioController.getById));

/**
 * @swagger
 * /api/horarios:
 *   post:
 *     summary: Crear un horario
 *     tags: [Horarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               diaSemana:
 *                 type: string
 *               horaDesde:
 *                 type: string
 *                 format: time
 *               horaHasta:
 *                 type: string
 *                 format: time
 *               periodicidad:
 *                 type: string
 *               comisionId:
 *                 type: string
 *               aulaId:
 *                 type: string
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
router.delete("/:id", asyncHandler(horarioController.delete));

module.exports = router;