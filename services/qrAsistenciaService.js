// ============================================================
// services/qrAsistenciaService.js
// ============================================================
// Lógica del QR de ASISTENCIA, atado a una COMISIÓN (no al aula).
//
// Cambio conceptual respecto al sistema anterior:
//
//   ANTES                          AHORA
//   ─────────────────────────────  ─────────────────────────────
//   El QR vive en aula.rtoken      El QR vive en comision.qrToken
//   Identifica un aula             Identifica una comisión
//   Si cambia el aula, hay que     Si cambia el aula, el QR sigue
//   regenerarlo                    funcionando sin tocarlo
//   Para saber qué comisión es,    La comisión ya está implícita
//   se busca el horario activo     en el token (no hace falta
//   ahora en esa aula              buscar horario)
//
// Beneficio práctico: si por reubicación de último momento el
// curso se mueve a otra aula, el QR que el docente generó esa
// mañana sigue siendo válido y registra contra la comisión correcta.
//
// El horario activo SIGUE siendo necesario, pero solo para validar
// que el escaneo se hace en "horario de clase" (no a cualquier horario).
// Se sigue chequeando, pero buscando por comisionId en vez de aulaId.
// ============================================================

const { Op } = require("sequelize");
const {
  Asistencia,
  Comision,
  Horario,
  Profesor,
  Matricula,
  Materia,
  Aula,
  Edificio,
} = require("../models");
const AppError = require("../errors/AppError");
const { calcularDistanciaMetros } = require("../utils/geolocation");

function nombreDia(date) {
  return [
    "domingo",
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
  ][date.getDay()];
}

class QrAsistenciaService {
  /**
   * Genera (o renueva) el QR de asistencia de una comisión.
   * Lo llama el DOCENTE titular antes de empezar la clase.
   *
   * @param {Object} params
   * @param {string} params.comisionId    - UUID de la comisión
   * @param {string} params.docenteDni    - DNI del docente logueado
   * @param {number} params.duracionMin   - duración del QR en minutos
   * @returns {Promise<Object>} - { qrToken, qrTokenExpira, duracionMinutos }
   */
  async generar({ comisionId, docenteDni, duracionMin }) {
    if (!comisionId) {
      throw AppError.badRequest("comisionId es requerido");
    }

    // Cargar comisión con su profesor titular para validar permisos.
    const comision = await Comision.findByPk(comisionId, {
      include: [{ model: Profesor, as: "profesor" }],
    });

    if (!comision) {
      throw AppError.notFound("Comisión no encontrada");
    }

    // Validación: solo el docente titular puede generar
    // el QR de su comisión. El admin NO puede generar QR de asistencia
    // (eso lo hace solo el docente, regla del nuevo diseño).
    if (
      comision.profesor &&
      docenteDni &&
      comision.profesor.dni !== String(docenteDni).trim()
    ) {
      throw AppError.forbidden(
        "Solo el docente titular puede generar el QR de asistencia de su comisión",
        "NOT_COMMISSION_TEACHER"
      );
    }

    // Duración configurable (entre 5 y 480 minutos, default 120).
    // Clamping defensivo por si llega un valor raro del frontend.
    const minutos = Math.max(5, Math.min(480, Number(duracionMin) || 120));
    const expira = new Date(Date.now() + minutos * 60 * 1000);

    // Generamos token nuevo siempre (rotación) para que QRs viejos
    // dejen de funcionar incluso si el anterior no había expirado.
    const crypto = require("crypto");
    const nuevoToken = crypto.randomBytes(32).toString("hex");

    await comision.update({
      qrToken: nuevoToken,
      qrTokenExpira: expira,
    });

    return {
      qrToken: nuevoToken,
      qrTokenExpira: expira,
      duracionMinutos: minutos,
      comisionId: comision.comisionId,
    };
  }

  /**
   * Valida que un token de QR exista y no haya expirado.
   * Lo llama el frontend al cargar la pantalla de registro,
   * para mostrar el cartel verde o rojo antes de pedir el DNI.
   *
   * Si el token expiró, lo LIMPIA de la DB (set null) para que el
   * siguiente intento devuelva 404 y no 410.
   *
   * @returns {Promise<{ok: true, comision: {...}}>}
   */
  async validar({ qrToken }) {
    if (!qrToken) {
      throw AppError.badRequest("qrToken es requerido");
    }

    const comision = await Comision.findOne({
      where: { qrToken },
      include: [
        { model: Materia, as: "materia" },
        { model: Profesor, as: "profesor" },
      ],
    });

    if (!comision) {
      throw AppError.forbidden("QR inválido", "INVALID_QR");
    }

    if (
      comision.qrTokenExpira &&
      new Date() > new Date(comision.qrTokenExpira)
    ) {
      // Limpieza: dejar la comisión sin QR vigente.
      await comision.update({ qrToken: null, qrTokenExpira: null });
      throw AppError.forbidden("El QR expiró", "QR_EXPIRED");
    }

    return {
      ok: true,
      comision: {
        comisionId: comision.comisionId,
        cod_comision: comision.cod_comision,
        materia: comision.materia?.nombre ?? null,
        docente: comision.profesor?.nombre_apellido ?? null,
        expiraEn: comision.qrTokenExpira,
      },
    };
  }

  /**
   * Registra la asistencia a partir del escaneo del QR.
   *
   * Flujo:
   *   1. Resolver qrToken → comisión vigente (sin expirar).
   *   2. Validar que haya un horario ACTIVO de esa comisión ahora.
   *      (Si está fuera de horario, no se registra: evita que un
   *      alumno escanee a las 3 AM y quede como presente.)
   *   3. Validar permisos:
   *        - Si tipoUsuario=ESTUDIANTE → debe estar matriculado.
   *        - Si tipoUsuario=PROFESOR → debe ser el docente titular.
   *   4. Validar geolocalización (si está configurada) 
   *   5. Verificar que no exista ya un registro hoy.
   *   6. Crear la asistencia.
   *
   * Esta función reemplaza al viejo "registrarDesdeQR" basado en
   * aulaId+rtoken. La firma del request cambia: ahora viene qrToken.
   *
   * @param {Object} data
   * @param {string} data.qrToken     - token del QR escaneado
   * @param {string} data.tipoUsuario - "ESTUDIANTE" | "PROFESOR"
   * @param {string} data.usuarioId   - DNI del usuario
   * @param {number} data.latitudUsuario - Latitud del usuario (coordenada geográfica)
   * @param {number} data.longitudUsuario - Longitud del usuario (coordenada geográfica)
   */
  async registrarDesdeQR(data) {
    const {
      qrToken,
      tipoUsuario,
      usuarioId,
      latitudUsuario,
      longitudUsuario
    } = data;

    if (!qrToken || !tipoUsuario || !usuarioId) {
      throw AppError.badRequest(
        "Faltan campos: qrToken, tipoUsuario, usuarioId, latitudUsuario, longitudUsuario"
      );
    }

    // ── 1. Token → comisión ──────────────────────────────────
    const comision = await Comision.findOne({
      where: { qrToken },
      include: [{ model: Profesor, as: "profesor" }],
    });

    if (!comision) {
      throw AppError.forbidden("QR inválido", "INVALID_QR");
    }

    if (
      comision.qrTokenExpira &&
      new Date() > new Date(comision.qrTokenExpira)
    ) {
      await comision.update({ qrToken: null, qrTokenExpira: null });
      throw AppError.forbidden("El QR expiró", "QR_EXPIRED");
    }

    // ── 2. Horario activo ahora ──────────────────────────────
    const now = new Date();
    const fecha = now.toISOString().split("T")[0];
    const horaRegistro = now.toTimeString().slice(0, 5);

    const horario = await Horario.findOne({
      where: {
        comisionId: comision.comisionId,
        diaSemana: nombreDia(now),
        horaDesde: { [Op.lte]: horaRegistro },
        horaHasta: { [Op.gte]: horaRegistro },
      },
    });

    if (!horario) {
      throw AppError.badRequest(
        `No hay clase activa de esta comisión ahora (${nombreDia(now)} ${horaRegistro})`,
        "NO_ACTIVE_CLASS"
      );
    }

    // ── 3. Permisos según tipo ───────────────────────────────
    const tipo = tipoUsuario.toUpperCase();
    const dni = String(usuarioId).trim();

    if (tipo === "ESTUDIANTE") {
      const matricula = await Matricula.findOne({
        where: { estudianteDni: dni, comisionId: comision.comisionId },
      });
      if (!matricula) {
        throw AppError.forbidden(
          "No pertenecés a esta comisión",
          "NOT_ENROLLED"
        );
      }
    } else if (tipo === "PROFESOR") {
      if (comision.profesor && comision.profesor.dni !== dni) {
        throw AppError.forbidden(
          "No sos el docente titular de esta comisión",
          "NOT_COMMISSION_TEACHER"
        );
      }
    } else {
      throw AppError.badRequest(
        'tipoUsuario debe ser "ESTUDIANTE" o "PROFESOR"',
        "INVALID_USER_TYPE"
      );
    }

    // ── 4. Verificación de geolocalización ──────────────────────────────
    // Validar que el usuario se encuentre físicamente dentro de un
    // radio permitido antes de registrar la asistencia.
    //
    // La ubicación de referencia se configura mediante variables
    // de entorno y representa el centro de la geocerca:
    //   UNAHUR_LAT
    //   UNAHUR_LON
    //   QR_GEOFENCE_METERS
    //
    // Si las coordenadas no están configuradas, la validación se omite.


    // Coordenadas del centro de la geocerca obtenidas desde variables de entorno.
    const centerLat = Number(process.env.UNAHUR_LAT);
    const centerLon = Number(process.env.UNAHUR_LON);

    // Radio máximo permitido para registrar asistencia.
    // Si no se configura explícitamente, se utilizarán 50 metros.
    const allowedMeters = Number(process.env.QR_GEOFENCE_METERS || 50);

    // Solo se realiza la validación si existe una geocerca configurada.
    const geolocalizacionConfigurada =
      !Number.isNaN(centerLat) &&
      !Number.isNaN(centerLon);

    if (geolocalizacionConfigurada) {

      // Si la geocerca está activa, el frontend debe enviar
      // coordenadas válidas para poder registrar asistencia.
      if (
        latitudUsuario === undefined ||
        longitudUsuario === undefined ||
        Number.isNaN(Number(latitudUsuario)) ||
        Number.isNaN(Number(longitudUsuario))
      ) {
        throw AppError.badRequest(
          "Se requiere la geolocalización. Por favor active la ubicación y permita compartirla para registrar la asistencia.",
          "GEOLOCATION_MISSING"
        );
      }
      //Para probar que recibe coordenadas
      console.log({
        latitudUsuario,
        longitudUsuario,
      });



      // Calcula la distancia entre la ubicación actual del usuario
      // y el centro de la geocerca configurada.
      const distanciaMetros = calcularDistanciaMetros(
        centerLat,
        centerLon,
        Number(latitudUsuario),
        Number(longitudUsuario)
      );

      // Si la distancia supera el radio permitido, se rechaza el registro de asistencia.
      if (distanciaMetros > allowedMeters) {
        throw AppError.forbidden(
          `Fuera del área permitida (${Math.round(
            distanciaMetros
          )} m > ${allowedMeters} m)`,
          "GEOLOCATION_OUT_OF_RANGE"
        );
      }
    }

    // ── 5. Evitar doble registro ─────────────────────────────
    const yaExiste = await Asistencia.findOne({
      where: {
        usuarioId: dni,
        comisionId: comision.comisionId,
        fecha,
      },
    });

    if (yaExiste) {
      throw AppError.conflict(
        "Ya registraste tu asistencia hoy",
        "ATTENDANCE_ALREADY_REGISTERED"
      );
    }

    // ── 6. Crear ─────────────────────────────────────────────
    const nueva = await Asistencia.create({
      usuarioId: dni,
      tipoUsuario: tipo,
      comisionId: comision.comisionId,
      fecha,
      horaRegistro,
      estado: "PRESENTE",
    });

    return nueva;
  }
}

module.exports = new QrAsistenciaService();
