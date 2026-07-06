// ============================================================
// routes/qr.js
// ==========================================================
//
// Estructura:
//
//   PÚBLICOS (sin auth)
//   ─────────────────────────────────────────────────────────────
//   GET  /api/qr/asistencia/validar?qrToken=...   ←trello134
//   POST /api/qr/asistencia/registrar             ←trello135
//
//   AUTENTICADOS
//   ─────────────────────────────────────────────────────────────
//   POST   /api/qr/asistencia/generar             ←trello134 (docente/admin)
//
//   DEPRECATED (se mantienen sin tocar)
//   ─────────────────────────────────────────────────────────────
//   POST /api/qr/generar      ← LEGACY (aulaId+rtoken)
//   GET  /api/qr/validar      ← LEGACY
//   POST /api/qr/registrar    ← LEGACY
//
// ============================================================

const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { Op } = require("sequelize");

const jwtAuth = require("../middleware/jwtAuth");
const requireRole = require("../middleware/requireRole");
const asyncHandler = require("../middleware/asyncHandler");

const qrAsistenciaController = require("../controllers/qrAsistenciaController");
const espacioQrController = require("../controllers/espacioQrController");

// Modelos para los endpoints legacy
const { Aula, Asistencia, Horario, Comision, Matricula, Profesor } =
  require("../models");

// ════════════════════════════════════════════════════════════
// ENDPOINTS NUEVOS — QR de ASISTENCIA (atado a comisión)
// ════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/qr/asistencia/generar:
 *   post:
 *     summary: Genera el QR de asistencia de una comisión (docente)
 *     tags: [QR Asistencia]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [comisionId]
 *             properties:
 *               comisionId:       { type: string, format: uuid }
 *               duracionMinutos:  { type: integer, default: 120 }
 *     responses:
 *       201: { description: QR generado }
 *       403: { description: No sos titular de la comisión }
 *       404: { description: Comisión no encontrada }
 */
router.post(
  "/asistencia/generar",
  jwtAuth,
  requireRole("docente", "administrador"),
  asyncHandler(qrAsistenciaController.generar)
);

/**
 * @swagger
 * /api/qr/asistencia/validar:
 *   get:
 *     summary: Valida un QR de asistencia (público)
 *     tags: [QR Asistencia]
 *     parameters:
 *       - in: query
 *         name: qrToken
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: QR válido }
 *       403: { description: QR inválido o expirado }
 */
router.get(
  "/asistencia/validar",
  asyncHandler(qrAsistenciaController.validar)
);

/**
 * @swagger
 * /api/qr/asistencia/registrar:
 *   post:
 *     summary: Registra asistencia escaneando QR de comisión
 *     tags: [QR Asistencia]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [qrToken, tipoUsuario, usuarioId]
 *             properties:
 *               qrToken:     { type: string }
 *               tipoUsuario: { type: string, enum: [ESTUDIANTE, PROFESOR] }
 *               usuarioId:   { type: string, description: DNI }
 *     responses:
 *       201: { description: Asistencia registrada }
 *       403: { description: No pertenecés a la comisión }
 *       409: { description: Ya registrado hoy }
 */
router.post(
  "/asistencia/registrar",
  asyncHandler(qrAsistenciaController.registrar)
);

// ════════════════════════════════════════════════════════════
// ENDPOINTS LEGACY — Mantener compatibilidad con la app actual
// ════════════════════════════════════════════════════════════
// Se mantienen funcionando porque la pantalla de RegistroAsistencia
// vieja todavía manda aulaId+rtoken. Cuando se actualice el front
// completamente al nuevo flujo, estos endpoints se pueden eliminar.

/* istanbul ignore next */
function nombreDia(date) {
  return [
    "domingo",
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
  ][date.getDay()];
}

/**
 * POST /api/qr/generar  (LEGACY)
 * Si llega comisionId → delega al flujo nuevo (qrAsistencia).
 * Si llega solo aulaId → comportamiento viejo.
 */
/* istanbul ignore next */
router.post("/generar", jwtAuth, async (req, res, next) => {
  try {
    if (req.body.comisionId) {
      // Delegar al controller nuevo
      return qrAsistenciaController.generar(req, res, next);
    }

    // ── Comportamiento legacy: QR en aula ──
    const { aulaId, duracionMinutos } = req.body;
    if (!aulaId) {
      return res
        .status(400)
        .json({ message: "comisionId o aulaId es requerido" });
    }

    const aula = await Aula.findByPk(aulaId);
    if (!aula) return res.status(404).json({ message: "Aula no encontrada" });

    const rtoken = crypto.randomBytes(16).toString("hex");
    const minutos = parseInt(
      duracionMinutos || process.env.DURACION_QR_MINUTOS || "120",
      10
    );
    const rtokenExpira = new Date(Date.now() + minutos * 60 * 1000);

    await aula.update({ rtoken, rtokenExpira });

    return res.status(200).json({
      message: "QR generado (legacy)",
      rtoken,
      expiraEn: rtokenExpira,
      minutos,
    });
  } catch (error) {
    console.error("Error generar QR (legacy):", error);
    return res.status(500).json({ message: "Error interno" });
  }
});

/**
 * GET /api/qr/validar  (LEGACY)
 */
router.get("/validar", async (req, res) => {
  try {
    const { edificioId, aulaId, rtoken } = req.query;

    const aula = await Aula.findOne({ where: { aulaId, edificioId } });

    if (!aula || !aula.rtoken || aula.rtoken !== rtoken) {
      return res.status(403).json({ ok: false, message: "QR inválido o expirado" });
    }

    if (aula.rtokenExpira && new Date() > new Date(aula.rtokenExpira)) {
      await aula.update({ rtoken: null, rtokenExpira: null });
      return res.status(403).json({ ok: false, message: "El QR expiró" });
    }

    return res.status(200).json({ ok: true, message: "QR válido" });
  } catch (error) {
    console.error("Error validar QR (legacy):", error);
    return res.status(500).json({ message: "Error interno" });
  }
});

/**
 * POST /api/qr/registrar  (LEGACY)
 */
/* istanbul ignore next */
router.post("/registrar", async (req, res) => {
  try {
    const { tipoUsuario, usuarioId, aulaId, rtoken, fechaInicio, fechaFin } =
      req.body;

    if (!tipoUsuario || !usuarioId || !aulaId || !rtoken) {
      return res.status(400).json({
        message: "Faltan campos: tipoUsuario, usuarioId, aulaId, rtoken",
      });
    }

    const aula = await Aula.findByPk(aulaId);
    if (!aula || !aula.rtoken || aula.rtoken !== rtoken) {
      return res.status(403).json({ message: "QR inválido o expirado" });
    }

    if (aula.rtokenExpira && new Date() > new Date(aula.rtokenExpira)) {
      await aula.update({ rtoken: null, rtokenExpira: null });
      return res.status(403).json({ message: "El QR expiró" });
    }

    const now = new Date();
    const fecha = now.toISOString().split("T")[0];
    const horaRegistro = now.toTimeString().slice(0, 5);

    if (fechaInicio && fechaFin) {
      if (now < new Date(fechaInicio) || now > new Date(fechaFin)) {
        return res
          .status(403)
          .json({ message: "QR fuera de su ventana de tiempo" });
      }
    }

    const horario = await Horario.findOne({
      where: {
        aulaId,
        diaSemana: nombreDia(now),
        horaDesde: { [Op.lte]: horaRegistro },
        horaHasta: { [Op.gte]: horaRegistro },
      },
      include: [
        {
          model: Comision,
          as: "comision",
          include: [{ model: Profesor, as: "profesor" }],
        },
      ],
    });

    if (!horario) {
      return res.status(400).json({
        message: `No hay clase activa en esta aula ahora (${nombreDia(now)} ${horaRegistro})`,
      });
    }

    const comisionId = horario.comisionId;
    const tipo = tipoUsuario.toUpperCase();

    if (tipo === "ESTUDIANTE") {
      const matricula = await Matricula.findOne({
        where: { estudianteDni: String(usuarioId).trim(), comisionId },
      });
      if (!matricula) {
        return res
          .status(403)
          .json({ message: "No estás matriculado en esta comisión" });
      }
    } else if (tipo === "PROFESOR") {
      const profe = horario.comision?.profesor;
      if (profe && profe.dni !== String(usuarioId).trim()) {
        return res
          .status(403)
          .json({ message: "No sos el docente titular de esta comisión" });
      }
    } else {
      return res
        .status(400)
        .json({ message: 'tipoUsuario debe ser "ESTUDIANTE" o "PROFESOR"' });
    }

    const yaExiste = await Asistencia.findOne({
      where: { usuarioId: String(usuarioId).trim(), comisionId, fecha },
    });
    if (yaExiste) {
      return res.status(409).json({ message: "Ya registraste tu asistencia hoy" });
    }

    const nueva = await Asistencia.create({
      usuarioId: String(usuarioId).trim(),
      tipoUsuario: tipo,
      comisionId,
      fecha,
      horaRegistro,
      estado: "PRESENTE",
    });

    return res.status(201).json({ message: "✅ Asistencia registrada", data: nueva });
  } catch (error) {
    console.error("Error registrar QR (legacy):", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

/**
 * @swagger
 * /api/qr/espacio/generar:
 *   post:
 *     summary: Generar un QR permanente para un aula
 *     tags: [QR Espacio]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [aulaId]
 *             properties:
 *               aulaId:
 *                 type: string
 *                 format: uuid
 *                 description: UUID del aula
 *     responses:
 *       201: { description: QR generado }
 *       403: { description: Sin permisos }
 *       404: { description: Aula no encontrada }
 */
router.post(
  "/espacio/generar",
  jwtAuth,
  requireRole("administrador"),
  asyncHandler(require("../controllers/espacioQrController").generar)
);

/**
 * @swagger
 * /api/qr/espacio/desactivar/{espacioQrId}:
 *   post:
 *     summary: Desactivar un QR específico
 *     tags: [QR Espacio]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: espacioQrId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: QR desactivado }
 *       403: { description: Sin permisos }
 *       404: { description: QR no encontrado }
 */
router.post(
  "/espacio/desactivar/:espacioQrId",
  jwtAuth,
  requireRole("administrador"),
  asyncHandler(require("../controllers/espacioQrController").desactivar)
);

/**
 * @swagger
 * /api/qr/espacio:
 *   get:
 *     summary: Listar todos los QRs de espacio
 *     tags: [QR Espacio]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: soloActivos
 *         schema: { type: boolean }
 *         description: Si es true, solo devuelve los activos
 *     responses:
 *       200: { description: Lista de QRs }
 *       403: { description: Sin permisos }
 */
router.get(
  "/espacio",
  jwtAuth,
  requireRole("administrador"),
  asyncHandler(require("../controllers/espacioQrController").listar)
);

/**
 * @swagger
 * /api/qr/espacio/info/{token}:
 *   get:
 *     summary: Resolver un token público (escaneo del QR)
 *     tags: [QR Espacio]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Info del aula }
 *       403: { description: QR inválido o desactivado }
 */
router.get(
  "/espacio/info/:token",
  asyncHandler(require("../controllers/espacioQrController").info)
);

module.exports = router;
