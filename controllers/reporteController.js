// controllers/reporteController.js
const ReporteService = require("../services/reporteService");

class ReporteController {
  async obtenerReporteAsistencias(req, res, next) {
    try {
      const { comisionId, fechaInicio, fechaFin, format } = req.query;

      const usuarioId = req.usuario?.dni;
      const rol = req.usuario?.rol;

      const resultado = await ReporteService.generarReporteAsistencias({
        usuarioId, // Enviamos el DNI del alumno logueado ('33333333')
        comisionId,
        fechaInicio,
        fechaFin,
        format,
        rol
      });

      res.setHeader('Content-Type', resultado.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${resultado.fileName}"`);
      
      resultado.stream.pipe(res);
    } catch (error) {
      console.error("Error en ReporteController:", error);
      next(error);
    }
  }
}

module.exports = new ReporteController();