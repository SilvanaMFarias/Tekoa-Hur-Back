// controllers/materiaController.js
const { Materia } = require("../models");
const BaseController = require("./baseController");

class MateriaController extends BaseController {
  constructor() {
    super(Materia); // no necesita include porque no pedimos relaciones en las rutas actuales
  }
}

module.exports = new MateriaController();
