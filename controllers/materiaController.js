// controllers/materiaController.js
const { Materia } = require("../models");
const BaseController = require("./baseController");

class MateriaController extends BaseController {
  constructor() {
    super(Materia); // no necesita include porque no pedimos relaciones en las rutas actuales
  }

  // Ejemplo de método específico (en caso de necesitar)
  async getByNombre(req, res) {
    try {
      const materia = await Materia.findOne({ where: { nombre: req.params.nombre } });
      if (!materia) return res.status(404).json({ message: "Materia no encontrada" });
      res.json(materia);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new MateriaController();
