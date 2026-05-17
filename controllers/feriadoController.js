const BaseController = require("./baseController");

const feriadoService = require("../services/feriadoService");

class FeriadoController extends BaseController {
  constructor() {
    super(feriadoService);
  }
}

module.exports = new FeriadoController();