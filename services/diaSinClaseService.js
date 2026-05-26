const BaseService = require("./baseService");

const {
  DiaSinClase,
  TipoEvento,
  Comision
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
}

module.exports = new DiaSinClaseService();
