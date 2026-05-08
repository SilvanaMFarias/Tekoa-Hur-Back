// ============================================================
// routes/asistencias.js
// ============================================================

const express    = require("express");
const router     = express.Router();
const { Op }     = require("sequelize");
const asyncHandler           = require("../middleware/asyncHandler");
const validateRequiredFields = require("../middleware/requiredFields");
const validateAsistencia     = require("../middleware/validateAsistencia");
const asistenciaController   = require("../controllers/asistenciaController");

// Importar modelos una sola vez al inicio del archivo
const {
  Asistencia, Aula, Horario, Matricula,
  Estudiante, Comision, Profesor,
} = require("../models");

// ── GET /api/asistencias ─────────────────────────────────────
router.get("/",    asyncHandler(asistenciaController.getAll));
router.get("/:id", asyncHandler(asistenciaController.getById));

// ── POST /api/asistencias ────────────────────────────────────
router.post("/",
  validateRequiredFields(["fecha","horaRegistro","tipoUsuario","usuarioId","estado","comisionId","aulaId"]),
  validateAsistencia,
  asistenciaController.create
);

router.put("/:id",    validateAsistencia, asistenciaController.update);
router.delete("/:id", asyncHandler(asistenciaController.delete));

// ── POST /api/asistencias/registrar-desde-qr ─────────────────
/**
 * @swagger
 * /api/asistencias/registrar-desde-qr:
 *   post:
 *     summary: Registra asistencia desde un escaneo de QR
 *     tags: [Asistencias]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tipoUsuario, usuarioId, aulaId, rtoken]
 *             properties:
 *               tipoUsuario: { type: string, enum: [ESTUDIANTE, PROFESOR] }
 *               usuarioId:   { type: string, description: "DNI del usuario" }
 *               aulaId:      { type: string, format: uuid }
 *               rtoken:      { type: string }
 *     responses:
 *       201: { description: Asistencia registrada }
 *       403: { description: QR inválido o usuario no pertenece }
 *       409: { description: Ya registrado hoy }
 */
router.post("/registrar-desde-qr", asyncHandler(asistenciaController.registrarDesdeQR));

// ── POST /api/asistencias/docente-presente ───────────────────
/**
 * @swagger
 * /api/asistencias/docente-presente:
 *   post:
 *     summary: El docente registra su presencia sin QR
 *     description: |
 *       Registra la asistencia del docente logueado directamente, sin escanear QR.
 *       Valida que sea titular de la comisión y que haya horario activo ahora.
 *     tags: [Asistencias]
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
 *               comisionId: { type: string, format: uuid }
 *     responses:
 *       201: { description: Presencia registrada }
 *       400: { description: No hay clase activa ahora }
 *       403: { description: No es titular de la comisión }
 *       409: { description: Ya registró hoy }
 */
router.post("/docente-presente", async (req, res) => {
  try {
    const { comisionId } = req.body;
    if (!comisionId) {
      return res.status(400).json({ message: "comisionId es requerido." });
    }

    const now          = new Date();
    const fecha        = now.toISOString().split("T")[0];
    const horaRegistro = now.toTimeString().slice(0, 5);
    const dias         = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"];
    const nombreDia    = dias[now.getDay()];

    const comision = await Comision.findByPk(comisionId, {
      include: [{ model: Profesor, as: "profesor" }],
    });
    if (!comision) {
      return res.status(404).json({ message: "Comisión no encontrada." });
    }

    const dniDocente = req.usuario?.dni;
    if (comision.profesor && comision.profesor.dni !== String(dniDocente).trim()) {
      return res.status(403).json({ message: "No sos el docente titular de esta comisión." });
    }

    const horario = await Horario.findOne({
      where: {
        comisionId,
        diaSemana:  nombreDia,
        horaDesde:  { [Op.lte]: horaRegistro },
        horaHasta:  { [Op.gte]: horaRegistro },
      },
    });
    if (!horario) {
      return res.status(400).json({
        message: `No hay clase activa ahora (${nombreDia} ${horaRegistro}).`,
      });
    }

    const yaExiste = await Asistencia.findOne({
      where: { usuarioId: String(dniDocente).trim(), comisionId, fecha },
    });
    if (yaExiste) {
      return res.status(409).json({ message: "Ya registraste tu presencia hoy en esta comisión." });
    }

    const nueva = await Asistencia.create({
      usuarioId:    String(dniDocente).trim(),
      tipoUsuario:  "PROFESOR",
      comisionId,
      fecha,
      horaRegistro,
      estado:       "PRESENTE",
    });

    return res.status(201).json({
      message: "✅ Presencia registrada correctamente.",
      data:    nueva,
    });

  } catch (err) {
    console.error("Error docente-presente:", err);
    return res.status(500).json({ message: "Error interno del servidor." });
  }
});

// ── POST /api/asistencias/confirmar-dia ──────────────────────
/**
 * @swagger
 * /api/asistencias/confirmar-dia:
 *   post:
 *     summary: Docente confirma la lista de asistencia del día
 *     tags: [Asistencias]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [comisionId, fecha, asistencias]
 *             properties:
 *               comisionId:   { type: string, format: uuid }
 *               aulaId:       { type: string, format: uuid }
 *               fecha:        { type: string, format: date }
 *               asistencias:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     dni:    { type: string }
 *                     estado: { type: string, enum: [PRESENTE, AUSENTE] }
 *     responses:
 *       200: { description: Día confirmado }
 */
router.post("/confirmar-dia", async (req, res) => {
  try {
    const { comisionId, aulaId, fecha, asistencias } = req.body;

    if (!comisionId || !fecha || !Array.isArray(asistencias)) {
      return res.status(400).json({
        message: "Faltan campos: comisionId, fecha y asistencias[]",
      });
    }

    const horaRegistro = new Date().toTimeString().slice(0, 5);
    let creados      = 0;
    let actualizados = 0;

    for (const item of asistencias) {
      const { dni, estado } = item;
      if (!dni || !estado) continue;

      const existente = await Asistencia.findOne({
        where: {
          usuarioId:   String(dni).trim(),
          comisionId,
          fecha,
          tipoUsuario: "ESTUDIANTE",
        },
      });

      if (existente) {
        if (existente.estado !== estado) {
          await existente.update({ estado });
          actualizados++;
        }
      } else {
        await Asistencia.create({
          usuarioId:    String(dni).trim(),
          tipoUsuario:  "ESTUDIANTE",
          comisionId,
          fecha,
          horaRegistro,
          estado,
        });
        creados++;
      }
    }

    if (aulaId) {
      await Aula.update(
        { rtoken: null, rtokenExpira: null },
        { where: { aulaId } }
      );
    }

    return res.json({
      ok: true,
      message: `Día confirmado. ${creados} registros creados, ${actualizados} actualizados.`,
      creados,
      actualizados,
    });

  } catch (err) {
    console.error("Error confirmar-dia:", err);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

// ── GET /api/asistencias/dia ─────────────────────────────────
/**
 * @swagger
 * /api/asistencias/dia:
 *   get:
 *     summary: Alumnos de una comisión con su estado de asistencia en un día
 *     tags: [Asistencias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: comisionId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: fecha
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Lista de alumnos con estado del día }
 */
router.get("/dia", async (req, res) => {
  try {
    const { comisionId, fecha } = req.query;
    if (!comisionId || !fecha) {
      return res.status(400).json({ message: "comisionId y fecha son requeridos" });
    }

    const matriculas = await Matricula.findAll({
      where: { comisionId },
      include: [{ model: Estudiante, as: "estudiante" }],
    });

    const registros = await Asistencia.findAll({
      where: { comisionId, fecha, tipoUsuario: "ESTUDIANTE" },
    });

    const estadoMap = {};
    for (const r of registros) {
      estadoMap[String(r.usuarioId)] = r.estado;
    }

    const lista = matriculas.map(m => ({
      dni:             m.estudianteDni,
      nombre_apellido: m.estudiante?.nombre_apellido ?? m.estudianteDni,
      estado:          estadoMap[m.estudianteDni] ?? "AUSENTE",
      escaneó:         !!estadoMap[m.estudianteDni],
    }));

    return res.json({ fecha, comisionId, alumnos: lista });

  } catch (err) {
    console.error("Error /dia:", err);
    return res.status(500).json({ message: "Error interno" });
  }
});

// ✅ module.exports al final — todos los endpoints ya están registrados
module.exports = router;
