// controllers/aulaController.js
const { Aula, Edificio } = require("../models");
const BaseController = require("./baseController");

class AulaController extends BaseController {
  constructor() {
    super(Aula, [{ model: Edificio, as: "edificio" }]);
  }
}

module.exports = new AulaController();
