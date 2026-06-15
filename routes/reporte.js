// routes/reporte.js
const express = require('express');
const router = express.Router();
const reporteController = require('../controllers/reporteController');
const jwtAuth = require('../middleware/jwtAuth');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * @swagger
 * /api/reportes/asistencias:
 * get:
 *    summary: Exportar reporte de asistencias
 *    tags:
 *      - name: Reportes
 *    parameters:
 *      - in: query
 *        name: format
 *        required: true
 *        schema:
 *          type: string
 *          enum: [pdf, csv]
 *    description: Formato de exportacion
 *    responses:
 *      - 200:
 *        description: Archivo generado correctamente
 */
router.get('/mis-asistencias', jwtAuth, asyncHandler((req, res, next) =>
  reporteController.obtenerReporteAsistencias(req, res, next)
));

module.exports = router;