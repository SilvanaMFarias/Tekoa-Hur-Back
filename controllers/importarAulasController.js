// ============================================================
// controllers/importarAulasController.js
// ============================================================
// Controller nuevo para importar aulas desde Excel.
// Vive separado del importarController principal (que maneja
// estudiantes/docentes/comisiones) para mantener modularidad.
// ============================================================

const importarAulasService = require("../services/importarAulasService");
const HistorialImportacionService = require("../services/historialImportacionService");

class ImportarAulasController {
  // ============================================================
  // POST /api/importar/aulas
  // ============================================================
  /**
   * Recibe el Excel, lo procesa, y guarda el resultado en el
   * historial de importaciones.
   */
  async importar(req, res, next) {
    // Validar que llegó un archivo
    if (!req.file) {
      return res.status(400).json({
        error: "No se recibió ningún archivo. Enviá el archivo en el campo 'archivo'.",
      });
    }

    const usuarioId = req.usuario?.usuarioId;
    const nombreArchivo = req.file.originalname;

    try {
      // ── Procesar el Excel ──
      const resultado = await importarAulasService.procesar(req.file.buffer);

      // ── Registrar en el historial (aprovechando lo de Adriana) ──
      const estado = resultado.errores.length > 0 ? "ERROR" : "EXITOSA";
      try {
        await HistorialImportacionService.registrar({
          usuarioId,
          origen: "AULAS",
          nombreArchivo,
          tipoOperacion: "ACTUALIZACION",
          estado,
          cantidadErrores: resultado.errores.length,
          detalle: {
            creadas: resultado.creadas,
            actualizadas: resultado.actualizadas,
            errores: resultado.errores,
          },
          descripcion: `Importación de aulas: ${resultado.creadas} creadas, ${resultado.actualizadas} actualizadas`,
          archivo: req.file.buffer,
        });
      } catch (histErr) {
        // Si falla el registro del historial, NO rompemos la importación.
        // Solo lo logueamos.
        console.error("Error registrando historial de importación:", histErr.message);
      }

      // ── Respuesta al frontend ──
      res.json({
        message: "Importación completada",
        creadas: resultado.creadas,
        actualizadas: resultado.actualizadas,
        ignoradas: resultado.ignoradas || 0,
        totalErrores: resultado.errores.length,
        errores: resultado.errores,
      });
    } catch (err) {
      // Error fatal (no del procesamiento por fila): registrar y devolver
      try {
        await HistorialImportacionService.registrar({
          usuarioId,
          origen: "AULAS",
          nombreArchivo,
          tipoOperacion: "ACTUALIZACION",
          estado: "ERROR",
          cantidadErrores: 1,
          detalle: { errorFatal: err.message },
          descripcion: `Importación de aulas FALLIDA: ${err.message}`,
          archivo: req.file.buffer,
        });
      } catch (_) {
        // Silenciar
      }
      next(err);
    }
  }
}

module.exports = new ImportarAulasController();
