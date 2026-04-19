// controllers/baseController.js
class BaseController {
  constructor(model, include = []) {
    this.model = model;
    this.include = include;
  }

  getAll = async (req, res) => {
    try {
      const items = await this.model.findAll({ include: this.include });
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  getById = async (req, res) => {
    try {
      const item = await this.model.findByPk(req.params.id, { include: this.include });
      if (!item) return res.status(404).json({ message: "Registro no encontrado" });
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  create = async (req, res) => {
    try {
      const item = await this.model.create(req.body);
      res.status(201).json(item);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  update = async (req, res) => {
    try {
      const [updated] = await this.model.update(req.body, { where: { asistenciaId: req.params.id } });
      if (!updated) return res.status(404).json({ message: "Registro no encontrado" });
      res.json({ message: "Registro actualizado" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  delete = async (req, res) => {
    try {
      const deleted = await this.model.destroy({ where: { asistenciaId: req.params.id } });
      if (!deleted) return res.status(404).json({ message: "Registro no encontrado" });
      res.json({ message: "Registro eliminado" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

module.exports = BaseController;
