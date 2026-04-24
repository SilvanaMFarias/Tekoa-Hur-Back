// routes/aulas.js
const express = require("express");
const router = express.Router();
const aulaController = require("../controllers/aulaController");
const asyncHandler = require("../middleware/asyncHandler");
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
 *     summary: Obtener aulas (con filtros opcionales)
 *     tags: [Aulas]
 *     parameters:
 *       - in: query
 *         name: edificioId
 *         schema:
 *           type: string
 *         required: false
 *         description: Filtrar aulas por edificio
 *     responses:
 *       200:
 *         description: Lista de aulas
 */
    router.get("/", asyncHandler((req, res, next) =>
      aulaController.getAll(req, res, next)
    ));

/**
 * @swagger
 * /api/aulas/{id}:
 *   get:
 *     summary: Obtener un aula por ID
 *     tags: [Aulas]
 */
router.get("/:id", asyncHandler(aulaController.getById));

/**
 * @swagger
 * /api/aulas:
 *   post:
 *     summary: Crear un aula
 *     tags: [Aulas]
 */
router.post(
  "/",
  validateRequiredFields(["edificioId"]),
  validateForeignKey(Edificio, "edificioId", "edificioId"),
  aulaController.create
);

/**
 * @swagger
 * /api/aulas/{id}:
 *   put:
 *     summary: Actualizar un aula
 *     tags: [Aulas]
 */
router.put(
  "/:id",
  validateForeignKey(Edificio, "edificioId", "edificioId"),
  aulaController.update
);

/**
 * @swagger
 * /api/aulas/{id}:
 *   delete:
 *     summary: Eliminar un aula
 *     tags: [Aulas]
 */
router.delete("/:id", asyncHandler(aulaController.delete));

module.exports = router;