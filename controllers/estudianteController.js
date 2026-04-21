// controllers/estudianteController.js
const { Estudiante, Comision } = require("../models");
const BaseController = require("./baseController");

class EstudianteController extends BaseController {
  constructor() {
    super(Estudiante, [{ model: Comision, as: "comisiones" }], "dni");
  }

  // Ejemplo de método específico: buscar estudiante por nombre
  async getByNombre(req, res) {
    try {
      const estudiante = await Estudiante.findOne({ where: { nombre_apellido: req.params.nombre } });
      if (!estudiante) return res.status(404).json({ message: "Estudiante no encontrado" });
      res.json(estudiante);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new EstudianteController();
