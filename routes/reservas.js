// ============================================================
// routes/reservas.js
// ============================================================
// Rutas REST para gestión de reservas de aulas.
//
// Convención REST seguida:
//   GET    /api/reservas                       → listar (con filtros)
//   GET    /api/reservas/:reservaId            → obtener una
//   POST   /api/reservas/verificar-conflictos  → chequear sin crear
//   POST   /api/reservas                       → crear
//   PUT    /api/reservas/:reservaId            → editar
//   DELETE /api/reservas/:reservaId            → cancelar (soft delete)
//
// Todas las rutas son SOLO ADMIN porque la gestión de espacios
// es una tarea administrativa. Si en el futuro queremos que los
// docentes puedan ver sus propias reservas, agregamos un endpoint
// público separado tipo GET /api/reservas/mias.
//
// El middleware jwtAuth ya se aplica en app.js al montar este router,
// por lo que acá solo agregamos requireRole.
// ============================================================

const express = require("express");
const router = express.Router();
const reservaController = require("../controllers/reservaController");
const requireRole = require("../middleware/requireRole");
const asyncHandler = require("../middleware/asyncHandler");

/**
 * @swagger
 * tags:
 *   - name: Reservas
 *     description: Gestión de reservas puntuales de aulas
 */

// ════════════════════════════════════════════════════════════
// LISTAR  GET /api/reservas
// ════════════════════════════════════════════════════════════
/**
 * @swagger
 * /api/reservas:
 *   get:
 *     summary: Listar reservas (con filtros opcionales)
 *     tags: [Reservas]
 *     parameters:
 *       - in: query
 *         name: aulaId
 *         schema: { type: string }
 *       - in: query
 *         name: estado
 *         schema: { type: string, enum: [confirmada, cancelada] }
 *       - in: query
 *         name: desde
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: hasta
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Lista de reservas
 */
router.get(
  "/",
  requireRole("administrador"),
  asyncHandler(reservaController.listar.bind(reservaController))
);

// ════════════════════════════════════════════════════════════
// VERIFICAR CONFLICTOS  POST /api/reservas/verificar-conflictos
// ════════════════════════════════════════════════════════════
// Esta ruta tiene que estar ANTES de /:reservaId, sino Express
// la interpreta como si "verificar-conflictos" fuera un reservaId.
/**
 * @swagger
 * /api/reservas/verificar-conflictos:
 *   post:
 *     summary: Verificar conflictos de una franja sin crear nada
 *     tags: [Reservas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [aulaId, fechaInicio, fechaFin]
 *             properties:
 *               aulaId: { type: string }
 *               fechaInicio: { type: string, format: date-time }
 *               fechaFin: { type: string, format: date-time }
 *               reservaIdExcluir: { type: string }
 *     responses:
 *       200:
 *         description: Resultado de la verificación
 */
router.post(
  "/verificar-conflictos",
  requireRole("administrador"),
  asyncHandler(reservaController.verificarConflictos.bind(reservaController))
);

// ════════════════════════════════════════════════════════════
// OCUPACIÓN GLOBAL  GET /api/reservas/ocupacion-global
// ════════════════════════════════════════════════════════════
// Eventos de TODAS las aulas en un rango. También va ANTES de
// /:reservaId para que Express no la interprete como un ID.
//
// Query: ?desde=2026-06-01&hasta=2026-07-01&edificioId=opcional
router.get(
  "/ocupacion-global",
  requireRole("administrador"),
  asyncHandler(reservaController.obtenerOcupacionGlobal.bind(reservaController))
);

// ════════════════════════════════════════════════════════════
// OBTENER POR ID  GET /api/reservas/:reservaId
// ════════════════════════════════════════════════════════════
router.get(
  "/:reservaId",
  requireRole("administrador"),
  asyncHandler(reservaController.obtenerPorId.bind(reservaController))
);

// ════════════════════════════════════════════════════════════
// CREAR  POST /api/reservas
// ════════════════════════════════════════════════════════════
/**
 * @swagger
 * /api/reservas:
 *   post:
 *     summary: Crear una nueva reserva
 *     tags: [Reservas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [aulaId, motivo, fechaInicio, fechaFin]
 *             properties:
 *               aulaId: { type: string }
 *               motivo: { type: string }
 *               fechaInicio: { type: string, format: date-time }
 *               fechaFin: { type: string, format: date-time }
 *               descripcion: { type: string }
 *               forzar:
 *                 type: boolean
 *                 description: Si true, ignora conflictos con otras reservas
 *     responses:
 *       201:
 *         description: Reserva creada
 *       409:
 *         description: Conflicto con cursada o reserva existente
 */
router.post(
  "/",
  requireRole("administrador"),
  asyncHandler(reservaController.crear.bind(reservaController))
);

// ════════════════════════════════════════════════════════════
// ACTUALIZAR  PUT /api/reservas/:reservaId
// ════════════════════════════════════════════════════════════
router.put(
  "/:reservaId",
  requireRole("administrador"),
  asyncHandler(reservaController.actualizar.bind(reservaController))
);

// ════════════════════════════════════════════════════════════
// CANCELAR  DELETE /api/reservas/:reservaId
// ════════════════════════════════════════════════════════════
router.delete(
  "/:reservaId",
  requireRole("administrador"),
  asyncHandler(reservaController.cancelar.bind(reservaController))
);

module.exports = router;
