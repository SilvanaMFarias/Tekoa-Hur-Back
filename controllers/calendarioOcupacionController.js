// ============================================================
// controllers/calendarioOcupacionController.js
// ============================================================
// Controller del calendario de ocupación
//
// Dos endpoints sirven al mismo dominio (ocupación de un aula),
// pero a contextos distintos:
//
//   1) ocupacionPublicaHoy(req, res)
//      → GET /api/qr/espacio/calendario/:token
//      Público (sin auth). Sirve a la pantalla pública que ve
//      quien escanea el QR físico. Muestra solo HOY desde la
//      hora actual hasta fin del día.
//
//   2) ocupacionAdmin(req, res)
//      → GET /api/aulas/:aulaId/ocupacion?desde=...&hasta=...
//      Privado (requiere admin). Sirve a la pantalla del
//      administrador. Permite ver cualquier rango (día/semana/mes).
// ============================================================

const calendarioOcupacionService = require("../services/calendarioOcupacionService");
const AppError = require("../errors/AppError");

class CalendarioOcupacionController {
  /**
   * GET /api/qr/espacio/calendario/:token
   *
   * Público (sin JWT). Devuelve la ocupación del aula HOY desde
   * la hora actual hasta el fin del día.
   *
   * No acepta parámetros de fecha. El rango lo decide el servidor:
   *   desde = ahora
   *   hasta = hoy 23:59:59
   *
   * Esto se hace así a propósito: la pantalla pública es simple,
   * no necesita selector de fecha. Quien escanea solo quiere
   * saber "qué pasa en este aula a partir de ahora".
   */
  ocupacionPublicaHoy = async (req, res) => {
    const { token } = req.params;

    // Calcular el rango "desde ahora hasta fin del día"
    const ahora = new Date();
    const finDelDia = new Date(ahora);
    finDelDia.setHours(23, 59, 59, 999);

    const resultado = await calendarioOcupacionService.obtenerOcupacionPorToken({
      token,
      desde: ahora,
      hasta: finDelDia,
    });

    return res.status(200).json({
      ok: true,
      ...resultado,
    });
  };

  /**
   * GET /api/aulas/:aulaId/ocupacion?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
   *
   * Privado (requiere JWT + rol administrador). Devuelve la
   * ocupación del aula en el rango solicitado por el admin.
   *
   * Acepta query params:
   *   - desde: fecha (YYYY-MM-DD)
   *   - hasta: fecha (YYYY-MM-DD)
   *   - soloVigentes: "true" | "false" (default true)
   *
   * Si no se pasan fechas, por defecto trae los próximos 30 días.
   */
  ocupacionAdmin = async (req, res) => {
    const { aulaId } = req.params;
    const { desde: desdeStr, hasta: hastaStr, soloVigentes: vigStr } = req.query;

    // Parseo de fechas con defaults seguros
    let desde;
    let hasta;

    if (desdeStr) {
      desde = new Date(desdeStr);
      if (isNaN(desde.getTime())) {
        throw AppError.badRequest("Parámetro 'desde' no es una fecha válida (use YYYY-MM-DD)");
      }
    } else {
      desde = new Date();
    }

    if (hastaStr) {
      hasta = new Date(hastaStr);
      if (isNaN(hasta.getTime())) {
        throw AppError.badRequest("Parámetro 'hasta' no es una fecha válida (use YYYY-MM-DD)");
      }
      // Asegurar que el día "hasta" incluya hasta las 23:59:59
      hasta.setHours(23, 59, 59, 999);
    } else {
      // Default: 30 días desde "desde"
      hasta = new Date(desde);
      hasta.setDate(hasta.getDate() + 30);
      hasta.setHours(23, 59, 59, 999);
    }

    // soloVigentes default true; admin lo puede sobreescribir
    // por ejemplo para ver el histórico del aula.
    const soloVigentes = vigStr === "false" ? false : true;

    const resultado = await calendarioOcupacionService.obtenerOcupacion({
      aulaId,
      desde,
      hasta,
      soloVigentes,
    });

    return res.status(200).json({
      ok: true,
      ...resultado,
    });
  };
}

module.exports = new CalendarioOcupacionController();
