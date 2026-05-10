// services/asistenciaService.js

const {
  Asistencia,
  Comision,
  Aula,
  Horario,
  Profesor,
  Matricula,
} = require("../models");

const BaseService = require("./baseService");
const { Op } = require("sequelize");
const AppError = require("../errors/AppError");

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

class AsistenciaService extends BaseService {
  constructor() {
    super(Asistencia, [
      { model: Comision, as: "comision" },
    ]);
  }

  async obtenerPorComision(comisionId) {
    return this.getAll({
      where: comisionId ? { comisionId } : {},
      order: [["fecha", "ASC"]],
    });
  }

  async registrarDesdeQR(data) {
    const {
      tipoUsuario,
      usuarioId,
      aulaId,
      rtoken,
      fechaInicio,
      fechaFin,
    } = data;

    if (!tipoUsuario || !usuarioId || !aulaId || !rtoken) {
      throw AppError.badRequest(
        "Faltan campos: tipoUsuario, usuarioId, aulaId, rtoken"
      );
    }

    // ─────────────────────────────────────
    // Validar aula + QR
    // ─────────────────────────────────────

    const aula = await Aula.findByPk(aulaId);

    if (aula?.rtoken !== rtoken) {
      throw AppError.forbidden(
        "QR inválido o expirado",
        "INVALID_QR"
      );
    }

    if (
      aula.rtokenExpira &&
      new Date() > new Date(aula.rtokenExpira)
    ) {
      await aula.update({
        rtoken: null,
        rtokenExpira: null,
      });

      throw AppError.forbidden(
        "El QR expiró",
        "QR_EXPIRED"
      );
    }

    const now = new Date();

    const fecha = now.toISOString().split("T")[0];

    const horaRegistro = now.toTimeString().slice(0, 5);

    // ─────────────────────────────────────
    // Validar ventana horaria
    // ─────────────────────────────────────

    if (fechaInicio && fechaFin) {
      if (
        now < new Date(fechaInicio) ||
        now > new Date(fechaFin)
      ) {
        throw AppError.forbidden(
          "QR fuera de su ventana horaria",
          "QR_OUTSIDE_WINDOW"
        );
      }
    }

    // ─────────────────────────────────────
    // Buscar horario activo
    // ─────────────────────────────────────

    const horario = await Horario.findOne({
      where: {
        aulaId,
        diaSemana: nombreDia(now),
        horaDesde: {
          [Op.lte]: horaRegistro,
        },
        horaHasta: {
          [Op.gte]: horaRegistro,
        },
      },
      include: [
        {
          model: Comision,
          as: "comision",
          include: [
            {
              model: Profesor,
              as: "profesor",
            },
          ],
        },
      ],
    });

    if (!horario) {
      throw AppError.badRequest(
        `No hay clase activa en esta aula (${nombreDia(now)} ${horaRegistro})`,
        "NO_ACTIVE_CLASS"
      );
    }

    const comisionId = horario.comisionId;

    const tipo = tipoUsuario.toUpperCase();

    // ─────────────────────────────────────
    // Validar usuario
    // ─────────────────────────────────────

    if (tipo === "ESTUDIANTE") {
      const matricula = await Matricula.findOne({
        where: {
          estudianteDni: String(usuarioId).trim(),
          comisionId,
        },
      });

      if (!matricula) {
        throw AppError.forbidden(
          "No pertenecés a esta comisión",
          "NOT_ENROLLED"
        );
      }
    } else if (tipo === "PROFESOR") {
      const profe = horario.comision?.profesor;

      if (
        profe &&
        profe.dni !== String(usuarioId).trim()
      ) {
        throw AppError.forbidden(
          "No sos el docente titular de esta comisión",
          "NOT_COMMISSION_TEACHER"
        );
      }
    } else {
      throw AppError.badRequest(
        'tipoUsuario debe ser "ESTUDIANTE" o "PROFESOR"',
        "INVALID_USER_TYPE"
      );
    }

    // ─────────────────────────────────────
    // Evitar duplicados
    // ─────────────────────────────────────

    const yaExiste = await this.findOne({
      where: {
        usuarioId: String(usuarioId).trim(),
        comisionId,
        fecha,
      },
    });

    if (yaExiste) {
      throw AppError.conflict(
        "Ya registraste tu asistencia hoy",
        "ATTENDANCE_ALREADY_REGISTERED"
      );
    }

    // ─────────────────────────────────────
    // Crear asistencia
    // ─────────────────────────────────────

    const nueva = await this.create({
      usuarioId: String(usuarioId).trim(),
      tipoUsuario: tipo,
      comisionId,
      fecha,
      horaRegistro,
      estado: "PRESENTE",
    });

    return nueva;
  }
}

module.exports = new AsistenciaService();