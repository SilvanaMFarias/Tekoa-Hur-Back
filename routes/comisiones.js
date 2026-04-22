// routes/comisiones.js
const express = require("express");
const router = express.Router();
const { Comision, Materia, Profesor } = require("../models");
const comisionController = require("../controllers/comisionController");
const asyncHandler = require("../middleware/asyncHandler");
const validateRequiredFields = require("../middleware/requiredFields");
const validateForeignKey = require("../middleware/foreignKeyValidation");

/**
 * @swagger
 * tags:
 *   - name: Comisiones
 *     description: Endpoints para gestión de comisiones
 */

/**
 * @swagger
 * /api/comisiones:
 *   get:
 *     summary: Obtener todas las comisiones
 *     tags: [Comisiones]
 *     responses:
 *       200:
 *         description: Lista de comisiones
 */
router.get("/", asyncHandler(comisionController.getAll));

/**
 * @swagger
 * /api/comisiones/{id}:
 *   get:
 *     summary: Obtener una comisión por ID
 *     tags: [Comisiones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/:id", asyncHandler(comisionController.getById));

/**
 * @swagger
 * /api/comisiones:
 *   post:
 *     summary: Crear una comisión
 *     tags: [Comisiones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cod_comision:
 *                 type: string
 *               materiaId:
 *                 type: string
 *               profesorId:
 *                 type: string
 */
router.post("/", 
  validateRequiredFields(['cod_comision', 'materiaId', 'profesorId']),
  validateForeignKey(Materia, 'materiaId', 'materiaId'),
  validateForeignKey(Profesor, 'profesorId', 'profesorId'),
  comisionController.create
);

/**
 * @swagger
 * /api/comisiones/{id}:
 *   put:
 *     summary: Actualizar una comisión
 *     tags: [Comisiones]
 */
router.put("/:id", 
  validateForeignKey(Materia, 'materiaId', 'materiaId'),
  validateForeignKey(Profesor, 'profesorId', 'profesorId'),
  comisionController.update
);

/**
 * @swagger
 * /api/comisiones/{id}:
 *   delete:
 *     summary: Eliminar una comisión
 *     tags: [Comisiones]
 */
router.delete("/:id", asyncHandler(comisionController.delete));

module.exports = router;