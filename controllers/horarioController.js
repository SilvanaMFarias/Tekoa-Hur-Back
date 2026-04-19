// controllers/horarioController.js
const { Horario, Comision, Aula } = require("../models");
const BaseController = require("./baseController");
const BaseService = require("../services/baseService");

class HorarioController extends BaseController {
  constructor() {
    super(new BaseService(Horario, [
      { model: Comision, as: "comision" },
      { model: Aula, as: "aula" }
    ]));
  }
}

module.exports = new HorarioController();
