// controllers/comisionController.js
const { Comision, Materia, Profesor, Horario, Estudiante } = require("../models");
const BaseController = require("./baseController");
const BaseService = require("../services/baseService");

class ComisionController extends BaseController {
  constructor() {
    super(new BaseService(Comision, [
      { model: Materia, as: "materia" },
      { model: Profesor, as: "profesor" },
      { model: Horario, as: "horarios" },
      { model: Estudiante, as: "estudiantes" }
    ]));
  }
}

module.exports = new ComisionController();
