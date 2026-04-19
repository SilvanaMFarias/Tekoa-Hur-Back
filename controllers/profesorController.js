// controllers/profesorController.js
const { Profesor, Comision } = require("../models");
const BaseController = require("./baseController");

class ProfesorController extends BaseController {
  constructor() {
    super(Profesor, [{ model: Comision, as: "comisiones" }]);
  }
}

module.exports = new ProfesorController();
