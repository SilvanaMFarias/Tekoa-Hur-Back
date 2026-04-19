// controllers/edificioController.js
const { Edificio } = require("../models");
const BaseController = require("./baseController");

class EdificioController extends BaseController {
  constructor() {
    super(Edificio);
  }
}

module.exports = new EdificioController();
