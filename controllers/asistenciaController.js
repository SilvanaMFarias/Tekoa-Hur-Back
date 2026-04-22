// controllers/asistenciaController.js
const { Asistencia, Comision } = require("../models");
const BaseController = require("./baseController");
const BaseService = require("../services/baseService");

class AsistenciaController extends BaseController {
  constructor() {
    super(new BaseService(Asistencia, [{ model: Comision, as: "comision" }]));
  }
}

module.exports = new AsistenciaController();
