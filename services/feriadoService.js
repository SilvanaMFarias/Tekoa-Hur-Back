const BaseService = require("./baseService");

const {
  Feriado,
  TipoEvento
} = require("../models");

class FeriadoService extends BaseService {
  constructor() {

    /** El segundo parámetro del BaseService es el include automático.*/
    super(Feriado, [
      {
        model: TipoEvento,
        as: "tipoEvento",
      },
    ]);
  }
}

module.exports = new FeriadoService();