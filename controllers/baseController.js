class BaseController {
  constructor(service) {
    this.service = service;
  }

  getAll = async (req, res, next) => {
    const items = await this.service.getAll();
    res.json(items);
  };

  getById = async (req, res, next) => {
    const item = await this.service.getById(req.params.id);
    if (!item) return res.status(404).json({ message: "Registro no encontrado" });
    res.json(item);
  };

  create = async (req, res, next) => {
    const item = await this.service.create(req.body);
    res.status(201).json(item);
  };

  update = async (req, res, next) => {
    const updated = await this.service.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Registro no encontrado" });
    res.json({ message: "Registro actualizado" });
  };

  delete = async (req, res, next) => {
    const deleted = await this.service.delete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Registro no encontrado" });
    res.json({ message: "Registro eliminado" });
  };
}

module.exports = BaseController;
