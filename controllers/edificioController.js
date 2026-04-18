// controllers/edificioController.js
const { Edificio } = require("../models");
const BaseController = require("./baseController");

class EdificioController extends BaseController {
  constructor() {
    super(Edificio, [], "edificioId");
  }

  // Ejemplo de método específico: buscar edificio por nombre
  async getByNombre(req, res) {
    try {
      const edificio = await Edificio.findOne({ where: { nombre: req.params.nombre } });
      if (!edificio) return res.status(404).json({ message: "Edificio no encontrado" });
      res.json(edificio);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new EdificioController();
