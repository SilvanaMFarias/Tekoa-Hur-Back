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
      throw new AppError(
        "Faltan campos: tipoUsuario, usuarioId, aulaId, rtoken",
        400
      );
    }

    // ─────────────────────────────────────
    // Validar aula + QR
    // ─────────────────────────────────────

    const aula = await Aula.findByPk(aulaId);

    if (!aula || aula.rtoken !== rtoken) {
      throw new AppError(
        "QR inválido o expirado",
        403
      );
    }

    if (!aula.rtoken || aula.rtoken !== rtoken) {
        throw new AppError(
          "QR inválido o expirado",
          403
        );
    }

    if (!aula.rtoken) {
      throw new AppError(
        "QR inválido o expirado",
        403
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

      throw new AppError(
        "El QR expiró",
        403
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
        throw new AppError(
          "QR fuera de su ventana horaria",
          403
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
      throw new AppError(
        `No hay clase activa en esta aula (${nombreDia(now)} ${horaRegistro})`,
        400
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
        throw new AppError(
          "No pertenecés a esta comisión",
          403
        );
      }
    } else if (tipo === "PROFESOR") {
      const profe = horario.comision?.profesor;

      if (
        profe &&
        profe.dni !== String(usuarioId).trim()
      ) {
        throw new AppError(
          "No sos el docente titular de esta comisión",
          403
        );
      }
    } else {
      throw new AppError(
        'tipoUsuario debe ser "ESTUDIANTE" o "PROFESOR"',
        400
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
      throw new AppError(
        "Ya registraste tu asistencia hoy",
        409
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