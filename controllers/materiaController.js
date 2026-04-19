// controllers/materiaController.js
const { Materia } = require("../models");
const BaseController = require("./baseController");
const BaseService = require("../services/baseService");

class MateriaController extends BaseController {
  constructor() {
    super(new BaseService(Materia)); // no necesita include porque no pedimos relaciones en las rutas actuales
  }
}

module.exports = new MateriaController();
