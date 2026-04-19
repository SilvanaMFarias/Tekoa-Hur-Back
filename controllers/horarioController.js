// controllers/horarioController.js
const { Horario, Comision, Aula } = require("../models");
const BaseController = require("./baseController");

class HorarioController extends BaseController {
  constructor() {
    super(Horario, [
      { model: Comision, as: "comision" },
      { model: Aula, as: "aula" }
    ]);
  }
}

module.exports = new HorarioController();
