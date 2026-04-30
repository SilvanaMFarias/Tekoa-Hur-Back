// ============================================================
// controllers/asistenciaController.js
// ============================================================
// FIXES:
//  ✅ getAll ahora filtra por ?comisionId si viene en query
//     (el BaseController.getAll no soportaba filtros → lo sobreescribimos)
//  ✅ registrarDesdeQR verifica rtokenExpira
//  ✅ registrarDesdeQR valida tanto ESTUDIANTE como PROFESOR
//  ✅ No pasa aulaId a Asistencia.create (el modelo no tiene ese campo)
// ============================================================

const { Asistencia, Comision, Aula, Horario, Profesor, Matricula } = require("../models");
const BaseController = require("./baseController");
const BaseService    = require("../services/baseService");
const { Op }         = require("sequelize");

function nombreDia(date) {
  return ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"][date.getDay()];
}

class AsistenciaController extends BaseController {
  constructor() {
    super(new BaseService(Asistencia, [{ model: Comision, as: "comision" }]));
  }

  // ── GET /api/asistencias?comisionId=UUID ────────────────────
  // ✅ FIX: sobreescribimos getAll del BaseController para soportar filtro
  getAll = async (req, res, next) => {
    try {
      const { comisionId } = req.query;
      const where = comisionId ? { comisionId } : {};

      const registros = await Asistencia.findAll({
        where,
        include: [{ model: Comision, as: "comision" }],
        order: [["fecha", "ASC"]],
      });

      res.json(registros);
    } catch (error) {
      next(error);
    }
  };

  // ── POST /api/asistencias/registrar-desde-qr ────────────────
  registrarDesdeQR = async (req, res) => {
    try {
      const { tipoUsuario, usuarioId, aulaId, rtoken, fechaInicio, fechaFin } = req.body;

      if (!tipoUsuario || !usuarioId || !aulaId || !rtoken) {
        return res.status(400).json({ message: "Faltan campos: tipoUsuario, usuarioId, aulaId, rtoken" });
      }

      // 1. Validar QR
      const aula = await Aula.findByPk(aulaId);
      if (!aula || !aula.rtoken || aula.rtoken !== rtoken) {
        return res.status(403).json({ message: "QR inválido o expirado" });
      }

      // ✅ FIX: verificar expiración
      if (aula.rtokenExpira && new Date() > new Date(aula.rtokenExpira)) {
        await aula.update({ rtoken: null, rtokenExpira: null });
        return res.status(403).json({ message: "El QR expiró" });
      }

      const now          = new Date();
      const fecha        = now.toISOString().split("T")[0];
      const horaRegistro = now.toTimeString().slice(0, 5);

      // 2. Validar ventana de tiempo opcional
      if (fechaInicio && fechaFin) {
        if (now < new Date(fechaInicio) || now > new Date(fechaFin)) {
          return res.status(403).json({ message: "QR fuera de su ventana horaria" });
        }
      }

      // 3. Buscar horario activo → obtiene comisionId automáticamente
      const horario = await Horario.findOne({
        where: {
          aulaId,
          diaSemana: nombreDia(now),
          horaDesde: { [Op.lte]: horaRegistro },
          horaHasta: { [Op.gte]: horaRegistro },
        },
        include: [{
          model: Comision,
          as: "comision",
          include: [{ model: Profesor, as: "profesor" }],
        }],
      });

      if (!horario) {
        return res.status(400).json({
          message: `No hay clase activa en esta aula (${nombreDia(now)} ${horaRegistro})`,
        });
      }

      const comisionId = horario.comisionId;
      const tipo       = tipoUsuario.toUpperCase();

      // 4. Validar pertenencia
      if (tipo === "ESTUDIANTE") {
        const matricula = await Matricula.findOne({
          where: { estudianteDni: String(usuarioId).trim(), comisionId },
        });
        if (!matricula) {
          return res.status(403).json({ message: "No pertenecés a esta comisión" });
        }
      } else if (tipo === "PROFESOR") {
        // ✅ FIX: validamos al docente también
        const profe = horario.comision?.profesor;
        if (profe && profe.dni !== String(usuarioId).trim()) {
          return res.status(403).json({ message: "No sos el docente titular de esta comisión" });
        }
      } else {
        return res.status(400).json({ message: 'tipoUsuario debe ser "ESTUDIANTE" o "PROFESOR"' });
      }

      // 5. Evitar doble registro
      const yaExiste = await Asistencia.findOne({
        where: { usuarioId: String(usuarioId).trim(), comisionId, fecha },
      });
      if (yaExiste) {
        return res.status(409).json({ message: "Ya registraste tu asistencia hoy" });
      }

      // 6. Crear asistencia — ✅ sin aulaId (no existe en el modelo)
      const nueva = await Asistencia.create({
        usuarioId:    String(usuarioId).trim(),
        tipoUsuario:  tipo,
        comisionId,
        fecha,
        horaRegistro,
        estado: "PRESENTE",
      });

      return res.status(201).json({ message: "✅ Asistencia registrada correctamente", data: nueva });

    } catch (error) {
      console.error("Error registrarDesdeQR:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  };
}

module.exports = new AsistenciaController();