// controllers/asistenciaController.js
const { Asistencia, Comision } = require("../models");
const BaseController = require("./baseController");

class AsistenciaController extends BaseController {
  constructor() {
    super(Asistencia, [{ model: Comision, as: "comision" }]);
  }
}

module.exports = new AsistenciaController();
