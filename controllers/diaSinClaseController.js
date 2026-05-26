const BaseController = require("./baseController");

const diaSinClaseService = require("../services/diaSinClaseService");

class DiaSinClaseController extends BaseController {
  constructor() {
    super(diaSinClaseService);
  }
}

module.exports = new DiaSinClaseController();