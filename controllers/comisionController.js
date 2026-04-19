// controllers/comisionController.js
const { Comision, Materia, Profesor, Horario, Estudiante } = require("../models");
const BaseController = require("./baseController");

class ComisionController extends BaseController {
  constructor() {
    super(Comision, [
      { model: Materia, as: "materia" },
      { model: Profesor, as: "profesor" },
      { model: Horario, as: "horarios" },
      { model: Estudiante, as: "estudiantes" }
    ], "comisionId");
  }

  // Ejemplo de método específico: buscar comisiones por materia
  async getByMateria(req, res) {
    try {
      const comisiones = await Comision.findAll({
        where: { materiaId: req.params.materiaId },
        include: [
          { model: Materia, as: "materia" },
          { model: Profesor, as: "profesor" }
        ]
      });
      res.json(comisiones);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new ComisionController();
