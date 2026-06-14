// routes/aulas.js
const express = require("express");
const router = express.Router();
const aulaController = require("../controllers/aulaController");
const aulaAtributosController = require("../controllers/aulaAtributosController");
const jwtAuth = require("../middleware/jwtAuth");
const requireRole = require("../middleware/requireRole");
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


/**
 * @swagger
 * /api/aulas/{aulaId}/atributos:
 *   get:
 *     summary: Obtener atributos de un aula
 *     tags: [Aulas]
 *     parameters:
 *       - in: path
 *         name: aulaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID del aula
 *     responses:
 *       200: { description: Atributos del aula (puede ser null si no se cargaron) }
 *       404: { description: Aula no encontrada }
 */
router.get(
  "/:aulaId/atributos",
  jwtAuth,
  asyncHandler(aulaAtributosController.obtener)
);

/**
 * @swagger
 * /api/aulas/{aulaId}/atributos:
 *   put:
 *     summary: Crear o actualizar atributos del aula (upsert)
 *     tags: [Aulas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: aulaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID del aula
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               capacidad:                { type: integer }
 *               tipoAula:                 { type: string }
 *               esLaboratorioInformatico: { type: boolean }
 *               cantidadPC:               { type: integer }
 *               descripcion:              { type: string }
 *               equipamiento:             { type: array, items: { type: string } }
 *     responses:
 *       200: { description: Atributos guardados }
 *       400: { description: Datos inválidos }
 *       403: { description: Sin permisos }
 *       404: { description: Aula no encontrada }
 */
router.put(
  "/:aulaId/atributos",
  jwtAuth,
  requireRole("administrador"),
  asyncHandler(aulaAtributosController.guardar)
);

/**
 * @swagger
 * /api/aulas/{aulaId}/atributos:
 *   delete:
 *     summary: Eliminar atributos del aula
 *     tags: [Aulas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: aulaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID del aula
 *     responses:
 *       200: { description: Atributos eliminados }
 *       403: { description: Sin permisos }
 *       404: { description: Aula no encontrada }
 */
router.delete(
  "/:aulaId/atributos",
  jwtAuth,
  requireRole("administrador"),
  asyncHandler(aulaAtributosController.eliminar)
);

/**
 * @swagger
 * /api/aulas/{aulaId}/ocupacion:
 *   get:
 *     summary: Calendario de ocupación del aula (admin)
 *     description: |
 *       Endpoint privado (requiere admin). Devuelve los eventos
 *       de ocupación del aula en un rango de fechas. Sirve a la
 *       pantalla del calendario administrativo (R3-CAL-03).
 *     tags: [Aulas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: aulaId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: desde
 *         schema: { type: string, format: date }
 *         description: Fecha desde (YYYY-MM-DD). Default - hoy
 *       - in: query
 *         name: hasta
 *         schema: { type: string, format: date }
 *         description: Fecha hasta (YYYY-MM-DD). Default - desde + 30 días
 *       - in: query
 *         name: soloVigentes
 *         schema: { type: boolean, default: true }
 *         description: Si es false, incluye eventos pasados (histórico)
 *     responses:
 *       200:
 *         description: Eventos de ocupación del aula en el rango
 *       400:
 *         description: Parámetros inválidos
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Aula no encontrada
 */
router.get(
  "/:aulaId/ocupacion",
  jwtAuth,
  requireRole("administrador"),
  asyncHandler(
    require("../controllers/calendarioOcupacionController").ocupacionAdmin
  )
);

module.exports = router;