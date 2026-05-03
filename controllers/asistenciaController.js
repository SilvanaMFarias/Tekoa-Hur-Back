// ============================================================
// controllers/asistenciaController.js
// ============================================================
// FIXES:
//  ✅ getAll filtra por ?comisionId
//  ✅ registrarDesdeQR usa req.user (JWT)
//  ✅ NO confía en usuarioId ni tipoUsuario del frontend
//  ✅ valida expiración de QR
//  ✅ valida estudiante y profesor
// ============================================================

const { Asistencia, Comision, Aula, Horario, Profesor, Matricula } = require("../models");
const BaseController = require("./baseController");
const BaseService    = require("../services/baseService");
const { Op }         = require("sequelize");
const { tipoUsuario, usuarioId } = req.body;
const usuarioId = req.user.id;
const tipoUsuario = req.user.rol;
const { aulaId, rtoken, fechaInicio, fechaFin } = req.body;
function nombreDia(date) {
  return ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"][date.getDay()];
}

class AsistenciaController extends BaseController {
  constructor() {
    super(new BaseService(Asistencia, [{ model: Comision, as: "comision" }]));
  }

  // ── GET /api/asistencias?comisionId=UUID ────────────────────
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
      // 🔐 Usuario autenticado desde JWT
      if (!req.user) {
        return res.status(401).json({ message: "No autenticado" });
      }

      const usuarioId   = req.user.id;
      const tipoUsuario = req.user.rol?.toUpperCase();

      const { aulaId, rtoken, fechaInicio, fechaFin } = req.body;

      if (!usuarioId || !tipoUsuario || !aulaId || !rtoken) {
        return res.status(400).json({
          message: "Faltan datos de autenticación o QR",
        });
      }

      // 1. Validar QR
      const aula = await Aula.findByPk(aulaId);
      if (!aula || !aula.rtoken || aula.rtoken !== rtoken) {
        return res.status(403).json({ message: "QR inválido o expirado" });
      }

      if (aula.rtokenExpira && new Date() > new Date(aula.rtokenExpira)) {
        await aula.update({ rtoken: null, rtokenExpira: null });
        return res.status(403).json({ message: "El QR expiró" });
      }

      const now          = new Date();
      const fecha        = now.toISOString().split("T")[0];
      const horaRegistro = now.toTimeString().slice(0, 5);

      // 2. Validar ventana opcional
      if (fechaInicio && fechaFin) {
        if (now < new Date(fechaInicio) || now > new Date(fechaFin)) {
          return res.status(403).json({ message: "QR fuera de horario" });
        }
      }

      // 3. Buscar horario activo
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
          message: `No hay clase activa (${nombreDia(now)} ${horaRegistro})`,
        });
      }

      const comisionId = horario.comisionId;

      // 4. Validar pertenencia
      if (tipoUsuario === "ESTUDIANTE") {
        const matricula = await Matricula.findOne({
          where: {
            estudianteDni: String(usuarioId).trim(),
            comisionId,
          },
        });

        if (!matricula) {
          return res.status(403).json({
            message: "No pertenecés a esta comisión",
          });
        }
      }

      if (tipoUsuario === "PROFESOR") {
        const profe = horario.comision?.profesor;

        if (profe && profe.dni !== String(usuarioId).trim()) {
          return res.status(403).json({
            message: "No sos el docente titular",
          });
        }
      }

      // 5. Evitar duplicados
      const yaExiste = await Asistencia.findOne({
        where: {
          usuarioId: String(usuarioId).trim(),
          comisionId,
          fecha,
        },
      });

      if (yaExiste) {
        return res.status(409).json({
          message: "Ya registraste asistencia hoy",
        });
      }

      // 6. Crear asistencia
      const nueva = await Asistencia.create({
        usuarioId:    String(usuarioId).trim(),
        tipoUsuario,
        comisionId,
        fecha,
        horaRegistro,
        estado: "PRESENTE",
      });

      return res.status(201).json({
        message: "✅ Asistencia registrada",
        data: nueva,
      });

    } catch (error) {
      console.error("Error registrarDesdeQR:", error);
      return res.status(500).json({
        message: "Error interno del servidor",
      });
    }
  };
}

module.exports = new AsistenciaController();