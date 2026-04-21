// controllers/matriculaController.js
const { Matricula, Estudiante, Comision } = require("../models");
const BaseController = require("./baseController");

class MatriculaController extends BaseController {
  constructor() {
    super(Matricula, [], "matriculaId");
  }

  // Validación específica al crear
  async create(req, res) {
    try {
      // Validar estudiante
      const estudiante = await Estudiante.findByPk(req.body.estudianteDni);
      if (!estudiante) {
        return res.status(400).json({ error: "Estudiante inválido" });
      }

      // Validar comisión
      const comision = await Comision.findByPk(req.body.comisionId);
      if (!comision) {
        return res.status(400).json({ error: "Comisión inválida" });
      }

      const matricula = await Matricula.create(req.body);
      res.status(201).json(matricula);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Validación específica al actualizar
  async update(req, res) {
    try {
      if (req.body.estudianteDni) {
        const estudiante = await Estudiante.findByPk(req.body.estudianteDni);
        if (!estudiante) {
          return res.status(400).json({ error: "Estudiante inválido" });
        }
      }

      if (req.body.comisionId) {
        const comision = await Comision.findByPk(req.body.comisionId);
        if (!comision) {
          return res.status(400).json({ error: "Comisión inválida" });
        }
      }

      const [updated] = await Matricula.update(req.body, { where: { matriculaId: req.params.id } });
      if (!updated) return res.status(404).json({ message: "Matrícula no encontrada" });
      res.json({ message: "Matrícula actualizada" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new MatriculaController();
