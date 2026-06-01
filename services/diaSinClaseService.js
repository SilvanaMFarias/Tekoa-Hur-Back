const BaseService = require("./baseService");

const {
  DiaSinClase,
  TipoEvento,
  Comision,
  Materia // Materia para el dropdown
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