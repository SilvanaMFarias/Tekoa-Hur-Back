// controllers/asistenciaController.js
const { Asistencia, Comision } = require("../models");
const BaseController = require("./baseController");

class AsistenciaController extends BaseController {
  constructor() {
    super(Asistencia, [{ model: Comision, as: "comision" }]);
  }

  // Ejemplo de método específico
  async getByUsuario(req, res) {
    try {
      const asistencias = await Asistencia.findAll({
        where: { usuarioId: req.params.usuarioId },
        include: [{ model: Comision, as: "comision" }]
      });
      res.json(asistencias);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new AsistenciaController();
