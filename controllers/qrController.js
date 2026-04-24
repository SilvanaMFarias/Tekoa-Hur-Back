const { Aula } = require('../models');

/**
 * Valida si un QR es auténtico comparando el rtoken recibido con el de la DB.
 */
const validarQR = async (req, res) => {
  try {
    const { edificioId, aulaId, rtoken } = req.query;

    const aula = await Aula.findOne({
      where: { aulaId, edificioId }
    });

    if (!aula || !aula.rtoken || aula.rtoken !== rtoken) {
      return res.status(403).json({
        ok: false,
        message: "Código QR inválido o expirado."
      });
    }

    return res.status(200).json({
      ok: true,
      message: "QR verificado correctamente."
    });

  } catch (error) {
    console.error("Error al validar QR:", error);
    return res.status(500).json({
      message: "Error interno del servidor."
    });
  }
};

module.exports = { validarQR };