// controllers/estudianteController.js
const { Estudiante, Comision } = require("../models");
const BaseController = require("./baseController");

class EstudianteController extends BaseController {
  constructor() {
    super(Estudiante, [{ model: Comision, as: "comisiones" }]);
  }
}

module.exports = new EstudianteController();
