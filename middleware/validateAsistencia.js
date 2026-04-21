const { Matricula, Comision, Horario, Profesor, Aula, Estudiante } = require('../models');
const { Op } = require('sequelize');

/**
 * Middleware para validar que:
 * 1. El usuario pertenezca a la comisión (Estudiante matriculado o Profesor asignado).
 * 2. El registro ocurra en el día, hora y aula correcta según el cronograma.
 */
const validateAsistencia = async (req, res, next) => {
  try {
    const { tipoUsuario, usuarioId, comisionId, fecha, horaRegistro, aulaId } = req.body;

    // 1. Validar existencia de la comisión
    const comision = await Comision.findByPk(comisionId, {
      include: [{ model: Profesor, as: 'profesor' }]
    });
    
    if (!comision) {
      return res.status(404).json({ message: `La comisión con ID ${comisionId} no existe.` });
    }

    // 2. Validar Pertenencia (Estudiante o Docente)
    if (tipoUsuario === 'ESTUDIANTE') {
      const matricula = await Matricula.findOne({
        where: { estudianteDni: usuarioId, comisionId }
      });

      if (!matricula) {
        return res.status(403).json({ message: "Acceso denegado: El estudiante no está matriculado en esta comisión." });
      }
    } else if (tipoUsuario === 'PROFESOR') {
      // Se asume que usuarioId enviado es el DNI del profesor
      if (comision.profesor && comision.profesor.dni !== usuarioId) {
        return res.status(403).json({ message: "Acceso denegado: Este docente no es el titular de esta comisión." });
      }
    } else {
      return res.status(400).json({ message: "Tipo de usuario no válido." });
    }

    // 3. Validar Día de la semana
    // Convertir la fecha (YYYY-MM-DD) al nombre del día en español
    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const [year, month, day] = fecha.split('-').map(Number);
    const fechaObj = new Date(year, month - 1, day);
    const nombreDia = diasSemana[fechaObj.getDay()];

    // 4. Validar Horario y Aula
    // Buscamos si existe un horario que coincida con el día, el rango de horas y el aula
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
        message: `Fuera de horario: No hay clases programadas para esta comisión el día ${nombreDia} a las ${horaRegistro}.` 
      });
    }

    // 5. Validar Aula (Si se proporciona en el body)
    if (aulaId && horarioValido.aulaId !== aulaId) {
      return res.status(400).json({ 
        message: `Ubicación incorrecta: La clase se dicta en el aula ${horarioValido.aula.sector}-${horarioValido.aula.numero}.` 
      });
    }

    // Adjuntar el horario validado al request por si el controlador lo necesita
    req.horarioValidado = horarioValido;
    next();
  } catch (error) {
    console.error("Error en validateAsistencia:", error);
    return res.status(500).json({ message: "Error interno al validar la asistencia." });
  }
};

module.exports = validateAsistencia;