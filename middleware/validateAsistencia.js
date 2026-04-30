// ============================================================
// middleware/validateAsistencia.js
// ============================================================
// FIX: agrega verificación de rtokenExpira
// ============================================================

const { Matricula, Comision, Horario, Profesor, Aula } = require("../models");
const { Op } = require("sequelize");

const validateAsistencia = async (req, res, next) => {
  try {
    const { tipoUsuario, usuarioId, comisionId, fecha, horaRegistro, aulaId, rtoken } = req.body;

    const comision = await Comision.findByPk(comisionId, {
      include: [{ model: Profesor, as: "profesor" }],
    });
    if (!comision) {
      return res.status(404).json({ message: `Comisión ${comisionId} no existe.` });
    }

    if (tipoUsuario === "ESTUDIANTE") {
      const matricula = await Matricula.findOne({
        where: { estudianteDni: String(usuarioId).trim(), comisionId },
      });
      if (!matricula) {
        return res.status(403).json({ message: "El estudiante no está matriculado en esta comisión." });
      }
    } else if (tipoUsuario === "PROFESOR") {
      if (comision.profesor && comision.profesor.dni !== String(usuarioId).trim()) {
        return res.status(403).json({ message: "Este docente no es el titular de la comisión." });
      }
    } else {
      return res.status(400).json({ message: "Tipo de usuario no válido." });
    }

    // Calcular día de semana desde fecha (sin depender de zona horaria del server)
    const dias = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"];
    const [y, m, d] = fecha.split("-").map(Number);
    const nombreDia = dias[new Date(y, m - 1, d).getDay()];

    const horarioValido = await Horario.findOne({
      where: {
        comisionId,
        diaSemana: nombreDia,
        horaDesde: { [Op.lte]: horaRegistro },
        horaHasta: { [Op.gte]: horaRegistro },
      },
      include: [{ model: Aula, as: "aula" }],
    });
    if (!horarioValido) {
      return res.status(400).json({ message: `Fuera de horario: ${nombreDia} ${horaRegistro}` });
    }

    const aulaActual = await Aula.findOne({ where: { aulaId } });
    if (!aulaActual || !aulaActual.rtoken || aulaActual.rtoken !== rtoken) {
      return res.status(403).json({ message: "QR inválido o expirado." });
    }

    // ✅ FIX: verificar expiración del token
    if (aulaActual.rtokenExpira && new Date() > new Date(aulaActual.rtokenExpira)) {
      return res.status(403).json({ message: "El QR expiró." });
    }

    if (horarioValido.aulaId !== aulaId) {
      return res.status(400).json({
        message: `Aula incorrecta: corresponde ${horarioValido.aula.sector}-${horarioValido.aula.numero}`,
      });
    }

    req.horarioValidado = horarioValido;
    next();
  } catch (error) {
    console.error("Error en validateAsistencia:", error);
    return res.status(500).json({ message: "Error interno al validar asistencia." });
  }
};

module.exports = validateAsistencia;