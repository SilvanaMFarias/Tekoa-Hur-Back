// controllers/horarioController.js
const { Horario, Comision, Aula } = require("../models");
const BaseController = require("./baseController");

class HorarioController extends BaseController {
  constructor() {
    super(Horario, [
      { model: Comision, as: "comision" },
      { model: Aula, as: "aula" }
    ], "horarioId");
  }

  // Validación específica al crear
  async create(req, res) {
    try {
      // Validar que la comisión exista
      const comision = await Comision.findByPk(req.body.comisionId);
      if (!comision) {
        return res.status(400).json({ error: "Comisión inválida" });
      }

      // Validar que el aula exista
      const aula = await Aula.findByPk(req.body.aulaId);
      if (!aula) {
        return res.status(400).json({ error: "Aula inválida" });
      }

      const horario = await Horario.create(req.body);
      res.status(201).json(horario);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Validación específica al actualizar
  async update(req, res) {
    try {
      if (req.body.comisionId) {
        const comision = await Comision.findByPk(req.body.comisionId);
        if (!comision) {
          return res.status(400).json({ error: "Comisión inválida" });
        }
      }

      if (req.body.aulaId) {
        const aula = await Aula.findByPk(req.body.aulaId);
        if (!aula) {
          return res.status(400).json({ error: "Aula inválida" });
        }
      }

      const [updated] = await Horario.update(req.body, { where: { horarioId: req.params.id } });
      if (!updated) return res.status(404).json({ message: "Horario no encontrado" });
      res.json({ message: "Horario actualizado" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new HorarioController();
