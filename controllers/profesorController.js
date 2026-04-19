// controllers/profesorController.js
const { Profesor, Comision } = require("../models");
const BaseController = require("./baseController");
const BaseService = require("../services/baseService");

class ProfesorController extends BaseController {
  constructor() {
    super(new BaseService(Profesor, [{ model: Comision, as: "comisiones" }]));
  }
}

module.exports = new ProfesorController();
