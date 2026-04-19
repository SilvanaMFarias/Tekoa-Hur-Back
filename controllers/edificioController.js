// controllers/edificioController.js
const { Edificio } = require("../models");
const BaseController = require("./baseController");
const BaseService = require("../services/baseService");

class EdificioController extends BaseController {
  constructor() {
    super(new BaseService(Edificio));
  }
}

module.exports = new EdificioController();
