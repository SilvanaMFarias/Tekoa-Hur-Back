// ============================================================
// routes/asistencias.js
// ============================================================
// CAMBIO: agrega POST /confirmar-dia
//   → El docente cierra el QR del día y guarda correcciones manuales
//   → Recibe la lista completa de alumnos con su estado final (P/A)
//   → Crea los AUSENTES que no escanearon y actualiza los que cambiaron
//   → Cierra el rtoken del aula para que nadie más pueda escanear
// ============================================================

const express    = require("express");
const router     = express.Router();
const { Op }     = require("sequelize");
const asyncHandler = require("../middleware/asyncHandler");
const validateRequiredFields = require("../middleware/requiredFields");
const validateAsistencia     = require("../middleware/validateAsistencia");
const asistenciaController   = require("../controllers/asistenciaController");
const { Asistencia, Aula, Horario, Matricula, Estudiante, Comision } = require("../models");

// Rutas existentes
router.get("/",    asyncHandler(asistenciaController.getAll));
router.get("/:id", asyncHandler(asistenciaController.getById));
router.post("/",
  validateRequiredFields(["fecha","horaRegistro","tipoUsuario","usuarioId","estado","comisionId","aulaId"]),
  validateAsistencia,
  asistenciaController.create
);
router.put("/:id",  validateAsistencia, asistenciaController.update);
router.delete("/:id", asyncHandler(asistenciaController.delete));
router.post("/registrar-desde-qr", asyncHandler(asistenciaController.registrarDesdeQR));

// ── POST /api/asistencias/confirmar-dia ──────────────────────
// El docente confirma la lista del día.
//
// Body:
// {
//   comisionId: UUID,
//   aulaId:     UUID,
//   fecha:      "YYYY-MM-DD",
//   asistencias: [
//     { dni: "12345678", estado: "PRESENTE" | "AUSENTE" },
//     ...  (un objeto por cada alumno matriculado)
//   ]
// }
//
// Lo que hace:
//  1. Por cada alumno en la lista:
//     - Si ya tiene registro ese día → actualiza estado si cambió
//     - Si no tiene registro → crea uno con el estado indicado
//  2. Cierra el rtoken del aula (nadie más puede escanear ese QR)
// ─────────────────────────────────────────────────────────────
router.post("/confirmar-dia", async (req, res) => {
  try {
    const { comisionId, aulaId, fecha, asistencias } = req.body;

    if (!comisionId || !fecha || !Array.isArray(asistencias)) {
      return res.status(400).json({
        message: "Faltan campos: comisionId, fecha y asistencias[]",
      });
    }

    // Necesitamos la hora para los registros nuevos
    const horaRegistro = new Date().toTimeString().slice(0, 5);

    let creados     = 0;
    let actualizados = 0;

    for (const item of asistencias) {
      const { dni, estado } = item;
      if (!dni || !estado) continue;

      // Buscar si ya existe registro para este alumno en esta fecha y comisión
      const existente = await Asistencia.findOne({
        where: {
          usuarioId:   String(dni).trim(),
          comisionId,
          fecha,
          tipoUsuario: "ESTUDIANTE",
        },
      });

      if (existente) {
        // Solo actualizar si el estado cambió (evitar writes innecesarios)
        if (existente.estado !== estado) {
          await existente.update({ estado });
          actualizados++;
        }
      } else {
        // Crear registro nuevo (ausente o presente que el docente agregó)
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

    // Cerrar el rtoken del aula para que el QR de ese día expire
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
// Devuelve todos los matriculados de una comisión para una fecha,
// con su estado en esa fecha (PRESENTE / AUSENTE / sin registro).
// Útil para armar la grilla del día que ve el docente.
//
// Query: ?comisionId=UUID&fecha=YYYY-MM-DD
// ─────────────────────────────────────────────────────────────
router.get("/dia", async (req, res) => {
  try {
    const { comisionId, fecha } = req.query;
    if (!comisionId || !fecha) {
      return res.status(400).json({ message: "comisionId y fecha son requeridos" });
    }

    // Todos los matriculados en la comisión
    const matriculas = await Matricula.findAll({
      where: { comisionId },
      include: [{ model: Estudiante, as: "estudiante" }],
    });

    // Registros de asistencia ya existentes para esa fecha
    const registros = await Asistencia.findAll({
      where: {
        comisionId,
        fecha,
        tipoUsuario: "ESTUDIANTE",
      },
    });

    // Map de dni → estado
    const estadoMap = {};
    for (const r of registros) {
      estadoMap[String(r.usuarioId)] = r.estado;
    }

    // Construir lista con todos los matriculados y su estado del día
    const lista = matriculas.map((m) => ({
      dni:            m.estudianteDni,
      nombre_apellido: m.estudiante?.nombre_apellido ?? m.estudianteDni,
      // Si no escaneó, por defecto AUSENTE
      estado:         estadoMap[m.estudianteDni] ?? "AUSENTE",
      // true si ya tiene registro (escaneó el QR)
      escaneó:        !!estadoMap[m.estudianteDni],
    }));

    return res.json({ fecha, comisionId, alumnos: lista });

  } catch (err) {
    console.error("Error /dia:", err);
    return res.status(500).json({ message: "Error interno" });
  }
});

module.exports = router;
// ── POST /api/asistencias/docente-presente ───────────────────
// El docente registra su propia presencia sin necesidad de QR.
// Requiere JWT válido con rol docente.
// Solo valida día/hora y que sea titular de la comisión.
// No requiere rtoken — el JWT es suficiente autenticación.
router.post("/docente-presente", async (req, res) => {
  try {
    const { comisionId } = req.body;
    if (!comisionId) {
      return res.status(400).json({ message: "comisionId es requerido." });
    }

    const { Asistencia, Comision, Horario, Profesor } = require("../models");
    const { Op } = require("sequelize");

    const now          = new Date();
    const fecha        = now.toISOString().split("T")[0];
    const horaRegistro = now.toTimeString().slice(0, 5);
    const dias         = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"];
    const nombreDia    = dias[now.getDay()];

    // Verificar que la comisión existe
    const comision = await Comision.findByPk(comisionId, {
      include: [{ model: Profesor, as: "profesor" }],
    });
    if (!comision) {
      return res.status(404).json({ message: "Comisión no encontrada." });
    }

    // Verificar que el docente logueado es el titular
    // req.usuario viene del middleware jwtAuth
    const dniDocente = req.usuario?.dni;
    if (comision.profesor && comision.profesor.dni !== String(dniDocente).trim()) {
      return res.status(403).json({ message: "No sos el docente titular de esta comisión." });
    }

    // Verificar que hay horario activo ahora
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
        message: `No hay clase activa ahora en esta comisión (${nombreDia} ${horaRegistro}).`,
      });
    }

    // Evitar doble registro en el mismo día
    const yaExiste = await Asistencia.findOne({
      where: { usuarioId: String(dniDocente).trim(), comisionId, fecha },
    });
    if (yaExiste) {
      return res.status(409).json({ message: "Ya registraste tu presencia hoy en esta comisión." });
    }

    // Crear asistencia del docente
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
