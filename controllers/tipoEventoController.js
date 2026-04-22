const BaseController = require('./baseController');
const { TipoEvento } = require('../models');

class TipoEventoController extends BaseController {
  constructor() {
    super(TipoEvento);
  }
}

module.exports = new TipoEventoController();