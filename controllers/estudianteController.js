// controllers/estudianteController.js
const { Estudiante, Comision } = require("../models");
const BaseController = require("./baseController");
const BaseService = require("../services/baseService");

class EstudianteController extends BaseController {
  constructor() {
    super(new BaseService(Estudiante, [{ model: Comision, as: "comisiones" }]));
  }
}

module.exports = new EstudianteController();
