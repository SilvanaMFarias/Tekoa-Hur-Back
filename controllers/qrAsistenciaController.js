// ============================================================
// controllers/qrAsistenciaController.js
// ============================================================
// HTTP layer del QR de asistencia (atado a Comisión).
// Reemplaza la lógica de generar/validar/registrar que antes estaba
// hardcodeada en routes/qr.js.
// ============================================================

const qrAsistenciaService = require("../services/qrAsistenciaService");

class QrAsistenciaController {
  /**
   * POST /api/qr/asistencia/generar
   * Body: { comisionId, duracionMinutos? }
   * Auth: jwtAuth + (rol docente o administrador)
   *
   * Nota de diseño: aunque el flujo de la app deja al docente
   * generarlo, también permitimos al admin (para casos de soporte).
   * La validación de "sos el titular" la hace el service.
   */
  generar = async (req, res) => {
    try {
      const { comisionId, duracionMinutos } = req.body;
      const docenteDni = req.usuario?.dni;
      const rol = req.usuario?.rol;

      // Si es admin, NO se valida titularidad de la comisión.
      // El service hace el check con docenteDni; pasamos null para
      // saltearlo cuando el rol es administrador.
      const dniParaValidar = rol === "administrador" ? null : docenteDni;

      const data = await qrAsistenciaService.generar({
        comisionId,
        docenteDni: dniParaValidar,
        duracionMin: duracionMinutos,
      });

      return res.status(201).json({
        message: "QR de asistencia generado",
        qrToken: data.qrToken,
        expiraEn: data.qrTokenExpira,
        duracionMinutos: data.duracionMinutos,
        comisionId: data.comisionId,
      });
    } catch (error) {
      console.error("Error generar QR asistencia:", error);
      return res
        .status(error.status || 500)
        .json({ message: error.message || "Error interno" });
    }
  };

  /**
   * GET /api/qr/asistencia/validar?qrToken=...
   * Sin auth (lo llama la pantalla pública de registro antes de
   * pedir DNI). Devuelve info pública de la comisión si el token
   * es válido.
   */
  validar = async (req, res) => {
    try {
      const { qrToken } = req.query;
      const data = await qrAsistenciaService.validar({ qrToken });
      return res.json(data);
    } catch (error) {
      return res
        .status(error.status || 500)
        .json({ ok: false, message: error.message || "Error interno" });
    }
  };

  /**
   * POST /api/qr/asistencia/registrar
   * Body: { qrToken, tipoUsuario, usuarioId }
   * Sin auth obligatorio (un estudiante sin sesión puede escanear).
   * El control de pertenencia (matriculado / titular) lo hace el service
   * comparando contra la DB.
   */
  registrar = async (req, res) => {
    try {
      const asistencia = await qrAsistenciaService.registrarDesdeQR(req.body);
      return res.status(201).json({
        message: "✅ Asistencia registrada",
        data: asistencia,
      });
    } catch (error) {
      console.error("Error registrar QR asistencia:", error);
      return res
        .status(error.status || 500)
        .json({ message: error.message || "Error interno" });
    }
  };
}

module.exports = new QrAsistenciaController();
