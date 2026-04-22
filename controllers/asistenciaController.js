// controllers/asistenciaController.js
const { Asistencia, Comision, Matricula, Horario, Aula } = require("../models");
const BaseController = require("./baseController");
const BaseService = require("../services/baseService");

class AsistenciaController extends BaseController {
  constructor() {
    super(new BaseService(Asistencia, [{ model: Comision, as: "comision" }]));
  }

  registrarDesdeQr = async (req, res, next) => {
    try {
      const { edificioId, aulaId, rtoken, dni, fechaInicio, fechaFin } = req.body;

      // Validar campos
      if (!edificioId || !aulaId || !rtoken || !dni || !fechaInicio || !fechaFin) {
        return res.status(400).json({ message: "Todos los campos son requeridos" });
      }

      // Verificar si el DNI está matriculado en alguna comisión que tenga clase en ese edificio/aula/horario
      const fechaInicioDate = new Date(fechaInicio);
      const fechaFinDate = new Date(fechaFin);

      const matriculas = await Matricula.findAll({
        where: { estudianteDni: dni },
        include: [{
          model: Comision,
          include: [{
            model: Horario,
            where: {
              diaSemana: fechaInicioDate.getDay(),
              horaInicio: { [require('sequelize').Op.lte]: fechaInicioDate },
              horaFin: { [require('sequelize').Op.gte]: fechaFinDate }
            },
            include: [{
              model: Aula,
              where: { aulaId, edificioId }
            }]
          }]
        }]
      });

      if (matriculas.length === 0) {
        return res.status(400).json({ message: "El estudiante no está matriculado en una comisión con clase en este aula/edificio/horario" });
      }

      // Registrar asistencia para cada comisión encontrada
      const asistencias = [];
      for (const matricula of matriculas) {
        const asistencia = await Asistencia.create({
          fecha: new Date().toISOString().split('T')[0], // Fecha actual
          horaRegistro: new Date(),
          tipoUsuario: 'estudiante',
          usuarioId: dni,
          estado: 'presente',
          comisionId: matricula.comisionId,
          aulaId
        });
        asistencias.push(asistencia);
      }

      res.json({ message: "Asistencia registrada correctamente", asistencias });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new AsistenciaController();
