const express    = require("express");
const router     = express.Router();
const { Op }     = require("sequelize");
const asyncHandler = require("../middleware/asyncHandler");
const validateRequiredFields = require("../middleware/requiredFields");
const validateAsistencia     = require("../middleware/validateAsistencia");
const asistenciaController   = require("../controllers/asistenciaController");
const { Asistencia, Aula, Horario, Matricula, Estudiante, Comision } = require("../models");
const auth = require("../middleware/basicAuth");
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
router.post( "/registrar-desde-qr",auth,asyncHandler(asistenciaController.registrarDesdeQR));
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