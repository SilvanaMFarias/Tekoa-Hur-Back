// controllers/matriculaController.js
const { Matricula } = require("../models");
const BaseController = require("./baseController");
const BaseService = require("../services/baseService");

class MatriculaController extends BaseController {
  constructor() {
    super(new BaseService(Matricula));
  }
}

module.exports = new MatriculaController();
