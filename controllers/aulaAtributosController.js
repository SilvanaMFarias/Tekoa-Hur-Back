// ============================================================
// controllers/aulaAtributosController.js
// ============================================================
// Endpoints HTTP de atributos de aula
//
// La lógica de negocio vive en services/aulaAtributosService.js.
// ============================================================

const aulaAtributosService = require("../services/aulaAtributosService");

class AulaAtributosController {
  /**
   * GET /api/aulas/:aulaId/atributos
   * Devuelve los atributos del aula, o null si no se cargaron.
   */
  obtener = async (req, res) => {
    const { aulaId } = req.params;
    const atributos = await aulaAtributosService.obtener(aulaId);

    return res.status(200).json({
      ok: true,
      atributos,
    });
  };

  /**
   * PUT /api/aulas/:aulaId/atributos
   * Body: { capacidad, tipoAula, esLaboratorioInformatico,
   *         cantidadPC, descripcion, equipamiento }
   * Auth: administrador
   */
  guardar = async (req, res) => {
    const { aulaId } = req.params;
    const atributos = await aulaAtributosService.guardar(aulaId, req.body);

    return res.status(200).json({
      ok: true,
      message: "Atributos guardados correctamente",
      atributos,
    });
  };

  /**
   * DELETE /api/aulas/:aulaId/atributos
   * Auth: administrador
   */
  eliminar = async (req, res) => {
    const { aulaId } = req.params;
    const resultado = await aulaAtributosService.eliminar(aulaId);

    return res.status(200).json({
      ok: true,
      message: resultado.eliminado
        ? "Atributos eliminados"
        : "El aula no tenía atributos cargados",
    });
  };
}

module.exports = new AulaAtributosController();
