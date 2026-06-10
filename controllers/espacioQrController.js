// ============================================================
// controllers/espacioQrController.js
// ============================================================//
// ============================================================

const espacioQrService = require("../services/espacioQrService");

class EspacioQrController {
  /**
   * POST /api/qr/espacio/generar
   * Body: { aulaId }
   * Auth: administrador
   */
  generar = async (req, res) => {
    const { aulaId } = req.body;
    const adminDni = req.usuario?.dni;

    const qr = await espacioQrService.generar({ aulaId, adminDni });

    return res.status(201).json({
      ok: true,
      message: "QR de espacio generado correctamente",
      espacioQR: qr,
    });
  };

  /**
   * POST /api/qr/espacio/desactivar/:espacioQrId
   * Auth: administrador
   */
  desactivar = async (req, res) => {
    const { espacioQrId } = req.params;
    const resultado = await espacioQrService.desactivar(espacioQrId);

    return res.status(200).json({
      ok: true,
      message: resultado.desactivado
        ? "QR desactivado correctamente"
        : "El QR ya estaba desactivado",
      desactivado: resultado.desactivado,
    });
  };

  /**
   * GET /api/qr/espacio?soloActivos=true
   * Auth: administrador
   */
  listar = async (req, res) => {
    const soloActivos = req.query.soloActivos === "true";
    const qrs = await espacioQrService.listar({ soloActivos });

    return res.status(200).json({
      ok: true,
      total: qrs.length,
      espacioQRs: qrs,
    });
  };

  /**
   * GET /api/qr/espacio/info/:token
   * PÚBLICO (sin auth): lo escanea cualquiera.
   */
  info = async (req, res) => {
    const { token } = req.params;
    const info = await espacioQrService.resolverPorToken(token);

    return res.status(200).json({
      ok: true,
      ...info,
    });
  };
}

module.exports = new EspacioQrController();
