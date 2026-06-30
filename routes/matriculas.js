// ============================================================
// routes/matriculas.js
// ============================================================
// Rutas REST para gestión de matrículas (inscripciones).
// Accesibles para administradores Y docentes.
// ============================================================
 
const express = require('express');
const router = express.Router();
const matriculaController = require('../controllers/matriculaController');
const requireRole = require('../middleware/requireRole');
const asyncHandler = require('../middleware/asyncHandler');
 
const adminODocente = requireRole('administrador', 'docente');
 
/**
 * @swagger
 * tags:
 *   - name: Matriculas
 *     description: Gestión de matrículas (inscripciones alumno-comisión)
 */
 
// ─── Rutas literales primero ─────────────────────────────────
 
/**
 * @swagger
 * /api/matriculas/materias-con-comisiones:
 *   get:
 *     summary: Lista todas las materias con sus comisiones (para inscribir)
 *     tags: [Matriculas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Listado de materias con sus comisiones y profesor
 */
router.get(
  '/materias-con-comisiones',
  adminODocente,
  asyncHandler(matriculaController.materiasConComisiones.bind(matriculaController))
);
 
/**
 * @swagger
 * /api/matriculas/por-estudiante/{dni}:
 *   get:
 *     summary: Lista las matrículas ACTIVAS de un alumno
 *     tags: [Matriculas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema:
 *           type: string
 *         description: DNI del estudiante
 *     responses:
 *       200:
 *         description: Matrículas activas con info de comisión, materia y docente
 *       404:
 *         description: Estudiante no encontrado
 */
router.get(
  '/por-estudiante/:dni',
  adminODocente,
  asyncHandler(matriculaController.listarPorEstudiante.bind(matriculaController))
);
 
/**
 * @swagger
 * /api/matriculas/comisiones-disponibles/{matriculaId}:
 *   get:
 *     summary: Lista comisiones de la MISMA materia (para cambio)
 *     description: Devuelve comisiones alternativas de la misma materia. Si la materia tiene solo una comisión, devuelve [].
 *     tags: [Matriculas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matriculaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lista de comisiones alternativas (puede estar vacía)
 *       404:
 *         description: Matrícula no encontrada
 */
router.get(
  '/comisiones-disponibles/:matriculaId',
  adminODocente,
  asyncHandler(matriculaController.comisionesDisponiblesParaCambio.bind(matriculaController))
);
 
/**
 * @swagger
 * /api/matriculas/cambiar-comision:
 *   post:
 *     summary: Cambiar a un alumno de comisión (misma materia)
 *     description: Da de baja la matrícula vieja (soft delete) y crea una nueva. Solo permite cambiar a comisiones de la MISMA materia.
 *     tags: [Matriculas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - matriculaId
 *               - nuevaComisionId
 *             properties:
 *               matriculaId:
 *                 type: string
 *                 format: uuid
 *                 description: ID de la matrícula actual
 *               nuevaComisionId:
 *                 type: string
 *                 format: uuid
 *                 description: ID de la comisión destino (debe ser de la misma materia)
 *     responses:
 *       200:
 *         description: Cambio realizado correctamente
 *       400:
 *         description: Validación falló (distinta materia, misma comisión, etc.)
 *       404:
 *         description: Matrícula o comisión destino no encontrada
 */
router.post(
  '/cambiar-comision',
  adminODocente,
  asyncHandler(matriculaController.cambiarComision.bind(matriculaController))
);
 
// ─── CRUD ────────────────────────────────────────────────────
 
/**
 * @swagger
 * /api/matriculas:
 *   post:
 *     summary: Inscribir a un alumno en una comisión
 *     description: Crea una matrícula activa. Valida que el alumno no esté ya inscripto en otra comisión de la misma materia.
 *     tags: [Matriculas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estudianteDni
 *               - comisionId
 *             properties:
 *               estudianteDni:
 *                 type: string
 *               comisionId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Matrícula creada
 *       400:
 *         description: Validación falló (ya inscripto en esta materia)
 *       404:
 *         description: Estudiante o comisión no encontrada
 */
router.post(
  '/',
  adminODocente,
  asyncHandler(matriculaController.inscribir.bind(matriculaController))
);
 
/**
 * @swagger
 * /api/matriculas/{matriculaId}:
 *   delete:
 *     summary: Dar de baja una matrícula (soft delete)
 *     description: Marca la matrícula con estado="baja" y registra fechaBaja. No borra de la BD.
 *     tags: [Matriculas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matriculaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Matrícula dada de baja
 *       400:
 *         description: La matrícula ya estaba dada de baja
 *       404:
 *         description: Matrícula no encontrada
 */
router.delete(
  '/:matriculaId',
  adminODocente,
  asyncHandler(matriculaController.darDeBaja.bind(matriculaController))
);
 
module.exports = router;