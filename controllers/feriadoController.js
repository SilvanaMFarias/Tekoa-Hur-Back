const BaseController = require('./baseController');
const { Feriado } = require('../models');

class FeriadoController extends BaseController {
  constructor() {
    super(Feriado);
  }
}

module.exports = new FeriadoController();