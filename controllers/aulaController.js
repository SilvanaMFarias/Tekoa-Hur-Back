// controllers/aulaController.js
const { Aula, Edificio } = require("../models");
const BaseController = require("./baseController");
const BaseService = require("../services/baseService");

class AulaController extends BaseController {
  constructor() {
    super(new BaseService(Aula, [{ model: Edificio, as: "edificio" }]));
  }
}

module.exports = new AulaController();
