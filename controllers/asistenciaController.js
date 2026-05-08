// controllers/asistenciaController.js

const BaseController = require("./baseController");
const asistenciaService = require("../services/asistenciaService");

class AsistenciaController extends BaseController {
  constructor() {
    super(asistenciaService);
  }

  getAll = async (req, res, next) => {
    try {
      const { comisionId } = req.query;

      const registros =
        await asistenciaService.obtenerPorComision(
          comisionId
        );

      res.json(registros);
    } catch (error) {
      next(error);
    }
  };

  registrarDesdeQR = async (req, res) => {
    try {
      const asistencia =
        await asistenciaService.registrarDesdeQR(
          req.body
        );

      return res.status(201).json({
        message:
          "✅ Asistencia registrada correctamente",
        data: asistencia,
      });
    } catch (error) {
      console.error("Error registrarDesdeQR:", error);

      return res.status(error.status || 500).json({
        message:
          error.message || "Error interno del servidor",
      });
    }
  };
}

module.exports = new AsistenciaController();