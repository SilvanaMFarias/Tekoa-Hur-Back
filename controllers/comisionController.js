// controllers/comisionController.js
const { Comision, Materia, Profesor, Horario, Estudiante } = require("../models");
const BaseController = require("./baseController");

class ComisionController extends BaseController {
  constructor() {
    super(Comision, [
      { model: Materia, as: "materia" },
      { model: Profesor, as: "profesor" },
      { model: Horario, as: "horarios" },
      { model: Estudiante, as: "estudiantes" }
    ]);
  }
}

module.exports = new ComisionController();
