const { Matricula, Comision, Horario, Profesor, Aula } = require('../models');
const { Op } = require('sequelize');

const validateAsistencia = async (req, res, next) => {
  try {
    const {
      tipoUsuario,
      usuarioId,
      comisionId,
      fecha,
      horaRegistro,
      aulaId,
      rtoken
    } = req.body;

    // 1. Validar comisión
    const comision = await Comision.findByPk(comisionId, {
      include: [{ model: Profesor, as: 'profesor' }]
    });

    if (!comision) {
      return res.status(404).json({
        message: `La comisión con ID ${comisionId} no existe.`
      });
    }

    // 2. Validar pertenencia
    if (tipoUsuario === 'ESTUDIANTE') {
      const matricula = await Matricula.findOne({
        where: { estudianteDni: usuarioId, comisionId }
      });

      if (!matricula) {
        return res.status(403).json({
          message: "El estudiante no está matriculado en esta comisión."
        });
      }

    } else if (tipoUsuario === 'PROFESOR') {
      if (comision.profesor && comision.profesor.dni !== usuarioId) {
        return res.status(403).json({
          message: "Este docente no es el titular de la comisión."
        });
      }

    } else {
      return res.status(400).json({
        message: "Tipo de usuario no válido."
      });
    }

    // 3. Día de semana
    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const [year, month, day] = fecha.split('-').map(Number);
    const fechaObj = new Date(year, month - 1, day);
    const nombreDia = diasSemana[fechaObj.getDay()];

    // 4. Validar horario
    const horarioValido = await Horario.findOne({
      where: {
        comisionId,
        diaSemana: nombreDia,
        horaDesde: { [Op.lte]: horaRegistro },
        horaHasta: { [Op.gte]: horaRegistro }
      },
      include: [{ model: Aula, as: 'aula' }]
    });

    if (!horarioValido) {
      return res.status(400).json({
        message: `Fuera de horario: ${nombreDia} ${horaRegistro}`
      });
    }

    // 5. Validar QR (rtoken)
    const aulaActual = await Aula.findOne({ where: { aulaId } });

    if (!aulaActual || !aulaActual.rtoken || aulaActual.rtoken !== rtoken) {
      return res.status(403).json({
        message: "QR inválido o expirado."
      });
    }

    // 6. Validar aula correcta
    if (horarioValido.aulaId !== aulaId) {
      return res.status(400).json({
        message: `Aula incorrecta: corresponde ${horarioValido.aula.sector}-${horarioValido.aula.numero}`
      });
    }

    req.horarioValidado = horarioValido;
    next();

  } catch (error) {
    console.error("Error en validateAsistencia:", error);
    return res.status(500).json({
      message: "Error interno al validar asistencia."
    });
  }
};

module.exports = validateAsistencia;