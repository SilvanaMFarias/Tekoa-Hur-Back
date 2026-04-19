// controllers/matriculaController.js
const { Matricula, Estudiante, Comision } = require("../models");
const BaseController = require("./baseController");

class MatriculaController extends BaseController {
  constructor() {
    super(Matricula, []);
  }
}

module.exports = new MatriculaController();
