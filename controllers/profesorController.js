// controllers/profesorController.js
const { Profesor, Comision } = require("../models");
const BaseController = require("./baseController");

class ProfesorController extends BaseController {
  constructor() {
    super(Profesor, [{ model: Comision, as: "comisiones" }], "profesorId");
  }

  // Ejemplo de método específico: buscar profesor por DNI
  async getByDni(req, res) {
    try {
      const profesor = await Profesor.findOne({ where: { dni: req.params.dni } });
      if (!profesor) return res.status(404).json({ message: "Profesor no encontrado" });
      res.json(profesor);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Ejemplo de método específico: buscar profesor por nombre
  async getByNombre(req, res) {
    try {
      const profesor = await Profesor.findOne({ where: { nombre_apellido: req.params.nombre } });
      if (!profesor) return res.status(404).json({ message: "Profesor no encontrado" });
      res.json(profesor);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new ProfesorController();
