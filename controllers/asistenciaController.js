const { Asistencia, Comision, Aula, Horario, Profesor, Matricula } = require("../models");
const BaseController = require("./baseController");
const BaseService = require("../services/baseService");
const { Op } = require("sequelize");

class AsistenciaController extends BaseController {
  constructor() {
    super(new BaseService(Asistencia, [{ model: Comision, as: "comision" }]));
  }

  registrarDesdeQR = async (req, res) => {
    try {
      const {
        tipoUsuario,
        usuarioId,
        aulaId,
        rtoken,
        fechaInicio,
        fechaFin
      } = req.body;

      // 🔹 1. VALIDAR QR
      const aula = await Aula.findByPk(aulaId);

      if (!aula || !aula.rtoken || aula.rtoken !== rtoken) {
        return res.status(403).json({ message: "QR inválido o expirado" });
      }

      // 🔹 2. FECHA ACTUAL
      const now = new Date();
      const fecha = now.toISOString().split("T")[0];
      const horaRegistro = now.toTimeString().slice(0, 5);

      // 🔹 2.1 VALIDAR RANGO DE FECHA DEL QR
      if (fechaInicio && fechaFin) {
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);

        if (now < inicio || now > fin) {
          return res.status(403).json({
            message: "QR fuera de vigencia"
          });
        }
      }

      const diasSemana = ["Domingo","Lunes","Martes","Miercoles","Jueves","Viernes","Sabado"];
      const nombreDia = diasSemana[now.getDay()];

      // 🔹 3. BUSCAR HORARIO (define la comisión automáticamente)
      const horario = await Horario.findOne({
        where: {
          aulaId,
          diaSemana: nombreDia,
          horaDesde: { [Op.lte]: horaRegistro },
          horaHasta: { [Op.gte]: horaRegistro }
        },
        include: [{
          model: Comision,
          as: "comision",
          include: [{ model: Profesor, as: "profesor" }]
        }]
      });

      if (!horario) {
        return res.status(400).json({
          message: "No hay clase en este aula en este momento"
        });
      }

      const comisionId = horario.comisionId;

      console.log({ usuarioId, comisionId });
      // 🔹 4. VALIDAR USUARIO
      if (tipoUsuario === "ESTUDIANTE") {
        const matricula = await Matricula.findOne({
          where: {
            estudianteDni: String(usuarioId).trim(),
            comisionId
          }
        });

        if (!matricula) {
          return res.status(403).json({
            message: "No pertenecés a esta comisión"
          });
        }
      }

      // 🔹 5. EVITAR DUPLICADOS
      const existe = await Asistencia.findOne({
        where: {
          usuarioId,
          comisionId,
          fecha
        }
      });

      if (existe) {
        return res.status(400).json({
          message: "Ya registraste asistencia hoy"
        });
      }

      // 🔹 6. CREAR ASISTENCIA
      const nueva = await Asistencia.create({
        usuarioId,
        tipoUsuario,
        comisionId,
        aulaId,
        fecha,
        horaRegistro,
        estado: "PRESENTE"
      });

      return res.status(201).json({
        message: "Asistencia registrada correctamente",
        data: nueva
      });

    } catch (error) {
      console.error("Error registrarDesdeQR:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  };
}

module.exports = new AsistenciaController();