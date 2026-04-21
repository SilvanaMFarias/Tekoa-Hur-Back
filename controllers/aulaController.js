// controllers/aulaController.js
const { Aula, Edificio } = require("../models");
const BaseController = require("./baseController");

class AulaController extends BaseController {
  constructor() {
    super(Aula, [{ model: Edificio, as: "edificio" }], "aulaId");
  }

  // Método específico: validación de edificio al crear
  async create(req, res) {
    try {
      const edificio = await Edificio.findByPk(req.body.edificioId);
      if (!edificio) {
        return res.status(400).json({ error: "Edificio inválido" });
      }
      const aula = await Aula.create(req.body);
      res.status(201).json(aula);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Método específico: validación de edificio al actualizar
  async update(req, res) {
    try {
      if (req.body.edificioId) {
        const edificio = await Edificio.findByPk(req.body.edificioId);
        if (!edificio) {
          return res.status(400).json({ error: "Edificio inválido" });
        }
      }

      const [updated] = await Aula.update(req.body, {
        where: { aulaId: req.params.id }
      });

      if (!updated) {
        return res.status(404).json({ message: "Aula no encontrada" });
      }

      res.json({ message: "Aula actualizada" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new AulaController();
