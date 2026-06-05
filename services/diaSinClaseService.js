const BaseService = require("./baseService");

const {
  DiaSinClase,
  TipoEvento,
  Comision,
  Materia, // Materia para el dropdown
  Feriado
} = require("../models");

class DiaSinClaseService extends BaseService {
  constructor() {
    // Includes automáticos
    super(DiaSinClase, [
      {
        model: TipoEvento,
        as: "tipoEvento",
      },
      {
        model: Comision,
        as: "comision",
      }
    ]);
  }

  async verificarConflictoComision(fecha, comisionId) {
    // si la fecha ya es un feriado institucional fijo no te deja crear
    const esFeriadoFijo = await Feriado.findOne({ where: { fecha } });
    if (esFeriadoFijo) {
      return { tipo: "feriado", datos: esFeriadoFijo };
    }

    // Validación por Comisión y Fecha
    const yaTieneDiaSinClase = await this.findOne({
      where: {
        fecha: fecha,
        comisionId: comisionId
      }
    });

    if (yaTieneDiaSinClase) {
      return { tipo: "comision_duplicada", datos: yaTieneDiaSinClase };
    }

    return null;
  }

  async getFormData() {
    // Ejecuta las consultas en paralelo usando Sequelize (findAll)
    const [materias, comisiones, diasSinClase, tipoEventos] = await Promise.all([
      Materia.findAll(),
      Comision.findAll({
        include: [{ model: Materia, as: "materia" }] // Así NextJS puede hacer c.materia?.nombre
      }),
      DiaSinClase.findAll(),
      TipoEvento.findAll()
    ]);

    return {
      materias,
      comisiones,
      diasSinClase,
      tipoEventos
    };
  }
}

module.exports = new DiaSinClaseService();