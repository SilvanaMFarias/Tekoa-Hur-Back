// controllers/qrController.js
const { v4: uuidv4 } = require('uuid');
const { Horario, Comision, Aula } = require('../models');

class QrController {
  generar = async (req, res, next) => {
    try {
      const { edificioId, aulaId, fechaInicio, fechaFin } = req.body;

      // Validar campos requeridos
      if (!edificioId || !aulaId || !fechaInicio || !fechaFin) {
        return res.status(400).json({ message: "edificioId, aulaId, fechaInicio y fechaFin son requeridos" });
      }

      // Generar token único
      const token = uuidv4();

      // Construir URL para el frontend
      const frontUrl = process.env.FRONT_URL || 'http://localhost:3000';
      const url = `${frontUrl}/registrar-asistencia?edificioId=${edificioId}&aulaId=${aulaId}&rtoken=${token}&fechaInicio=${encodeURIComponent(fechaInicio)}&fechaFin=${encodeURIComponent(fechaFin)}`;

      res.json({ url, token });
    } catch (error) {
      next(error);
    }
  };

  validar = async (req, res, next) => {
    try {
      const { edificioId, aulaId, rtoken, fechaInicio, fechaFin } = req.query;

      // Validar campos requeridos
      if (!edificioId || !aulaId || !rtoken || !fechaInicio || !fechaFin) {
        return res.status(400).json({ message: "edificioId, aulaId, rtoken, fechaInicio y fechaFin son requeridos" });
      }

      // Verificar si hay horarios en esa aula/edificio en el rango de fechas
      const fechaInicioDate = new Date(fechaInicio);
      const fechaFinDate = new Date(fechaFin);

      const horarios = await Horario.findAll({
        include: [{
          model: Comision,
          include: [{
            model: Aula,
            where: { aulaId, edificioId }
          }]
        }],
        where: {
          diaSemana: fechaInicioDate.getDay(), // Asumir que fechaInicio tiene el día
          horaInicio: { [require('sequelize').Op.lte]: fechaInicioDate },
          horaFin: { [require('sequelize').Op.gte]: fechaFinDate }
        }
      });

      if (horarios.length === 0) {
        return res.status(400).json({ message: "No hay clases programadas en este aula/edificio en el horario especificado" });
      }

      // Aquí podrías validar el token si lo guardas en DB, pero por ahora, asumir válido
      res.json({ valido: true, message: "QR válido" });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new QrController();