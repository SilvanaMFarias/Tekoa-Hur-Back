// ============================================================
// services/calendarioOcupacionService.js
// ============================================================
// Service del calendario de ocupación
//
// Sirve a DOS pantallas distintas:
//
//   PANTALLA PÚBLICA
//   ─────────────────────────────────────────────────────────
//   Quien escanea el QR ve qué pasa HOY en el aula desde la
//   hora actual en adelante. No requiere login.
//
//   PANTALLA ADMIN
//   ─────────────────────────────────────────────────────────
//   El administrador ve un calendario completo del aula con
//   vistas día/semana/mes. Sirve para detectar conflictos al
//   armar reservas.
//
// Un solo método público:
//
//   obtenerOcupacion({ aulaId, desde, hasta, soloVigentes })
//
// El controller decide cómo lo invoca según el endpoint.
// ============================================================

const { Op } = require("sequelize");
const {
  Horario,
  Comision,
  Materia,
  Profesor,
  Reserva,
  Usuario,
  DiaSinClase,
  Feriado,
  Aula,
  Edificio,
  EspacioQR,
  AulaAtributos,
} = require("../models");
const AppError = require("../errors/AppError");

// ─── Constantes de colores (frontend las usa directo) ────────
// Convención: verde para clases, azul para reservas.
// Si el front decide cambiarlos, basta con tocar acá.
const COLOR_CURSADA = "#1B5E20";
const COLOR_RESERVA = "#1565C0";

// ─── Mapeo de día semana ──────────────────────────────────────
// El campo Horario.diaSemana guarda strings en español ("Lunes",
// "Martes", etc). JavaScript devuelve números (0=Domingo, 1=Lunes...).
// Usamos este mapa para convertir el número a string al filtrar.
const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

class CalendarioOcupacionService {
  /**
   * Obtiene los eventos de ocupación de un aula en un rango de fechas.
   *
   * @param {Object} params
   * @param {string} params.aulaId         - UUID del aula
   * @param {Date}   params.desde          - Fecha/hora desde (inclusive)
   * @param {Date}   params.hasta          - Fecha/hora hasta (inclusive)
   * @param {boolean} [params.soloVigentes=true] - Si true, descarta eventos
   *                                              cuya hora fin < ahora
   * @returns {Promise<Object>} { aula, eventos: [] }
   */
  async obtenerOcupacion({ aulaId, desde, hasta, soloVigentes = true }) {
    // ── 1. Validaciones de entrada ─────────────────────────
    if (!aulaId) throw AppError.badRequest("aulaId es requerido");
    if (!(desde instanceof Date) || !(hasta instanceof Date)) {
      throw AppError.badRequest("desde y hasta deben ser fechas válidas");
    }
    if (desde > hasta) {
      throw AppError.badRequest("desde debe ser anterior a hasta");
    }

    // ── 2. Verificar que el aula exista ────────────────────
    const aula = await Aula.findByPk(aulaId, {
      include: [{ model: Edificio, as: "edificio" }],
    });
    if (!aula) throw AppError.notFound("Aula no encontrada");

    // ── 3. Cargar excepciones para filtrar (días sin clase + feriados) ──
    // Lo hacemos en paralelo porque son consultas independientes.
    const [horarios, reservas, diasSinClase, feriados] = await Promise.all([
      this._obtenerHorariosDelAula(aulaId),
      this._obtenerReservasDelAula(aulaId, desde, hasta, soloVigentes),
      this._obtenerDiasSinClase(desde, hasta),
      this._obtenerFeriados(desde, hasta),
    ]);

    // ── 4. Armar set de fechas excluidas (para acelerar lookups) ──
    //
    // Usamos un Set de strings "YYYY-MM-DD" porque buscar en un Set
    // es O(1) vs O(N) en un array. Si tenemos 365 fechas y 1000
    // horarios expandidos, hace la diferencia.
    const fechasExcluidas = new Set();
    diasSinClase.forEach((d) => {
      fechasExcluidas.add(this._fechaToYMD(d.fecha));
    });
    feriados.forEach((f) => {
      fechasExcluidas.add(this._fechaToYMD(f.fecha));
    });

    // ── 5. Expandir horarios recurrentes en fechas reales ──
    const eventosCursada = this._expandirHorarios({
      horarios,
      desde,
      hasta,
      fechasExcluidas,
      soloVigentes,
    });

    // ── 6. Mapear reservas al formato del calendario ───────
    const eventosReserva = reservas.map((r) => this._reservaAEvento(r));

    // ── 7. Combinar y ordenar por fecha de inicio ──────────
    const eventos = [...eventosCursada, ...eventosReserva].sort(
      (a, b) => new Date(a.start) - new Date(b.start)
    );

    // ── 8. Devolver estructura final ───────────────────────
    return {
      aula: {
        aulaId: aula.aulaId,
        sector: aula.sector,
        numero: aula.numero,
        nombreCompleto: `${aula.sector}-${aula.numero}`,
        edificio: aula.edificio
          ? {
              edificioId: aula.edificio.edificioId,
              nombre: aula.edificio.nombre,
            }
          : null,
      },
      rango: {
        desde: desde.toISOString(),
        hasta: hasta.toISOString(),
      },
      eventos,
    };
  }

  /**
   * Versión PÚBLICA: resuelve el token primero, después obtiene
   * la ocupación del aula correspondiente.
   *
   * Sirve a la pantalla pública: muestra qué pasa HOY
   * desde la hora actual hasta el fin del día.
   */
  async obtenerOcupacionPorToken({ token, desde, hasta }) {
    if (!token) throw AppError.badRequest("token es requerido");

    // Resolver el QR (mismo patrón que resolverPorToken en R2-04)
    const qr = await EspacioQR.findOne({
      where: { token, activo: true },
    });
    if (!qr) {
      throw AppError.forbidden("QR inválido o desactivado", "INVALID_QR");
    }

    // Cargar atributos opcionales del aula (para mostrarlos junto)
    const atributos = await AulaAtributos.findByPk(qr.aulaId);

    // Delegar al método general
    const resultado = await this.obtenerOcupacion({
      aulaId: qr.aulaId,
      desde,
      hasta,
      soloVigentes: true,
    });

    // Enriquecer con atributos para que la pantalla pública los muestre
    return {
      ...resultado,
      atributos: atributos || null,
    };
  }

  // ════════════════════════════════════════════════════════════════
  // MÉTODOS PRIVADOS (los precedo con guion bajo)
  // ════════════════════════════════════════════════════════════════

  /**
   * Trae todos los horarios de un aula con su comisión, materia y docente.
   *
   * Eager loading con dos niveles de include:
   * horario → comisión → (materia, profesor)
   *
   * Esto evita el problema N+1: en lugar de 1 query + N queries
   * adicionales, una sola query con varios JOINs.
   */
  async _obtenerHorariosDelAula(aulaId) {
    return Horario.findAll({
      where: { aulaId },
      include: [
        {
          model: Comision,
          as: "comision",
          include: [
            { model: Materia, as: "materia" },
            { model: Profesor, as: "profesor" },
          ],
        },
      ],
    });
  }

  /**
   * Trae las reservas de un aula que se SUPERPONEN con el rango pedido.
   *
   * Una reserva (R1) se superpone con un rango (R2) si:
   *   R1.fechaInicio < R2.hasta  AND  R1.fechaFin > R2.desde
   *
   * Si soloVigentes=true, además exige que fechaFin >= ahora
   * (descarta las que ya terminaron).
   */
  async _obtenerReservasDelAula(aulaId, desde, hasta, soloVigentes) {
    const where = {
      aulaId,
      estado: "confirmada",
      // Detección de superposición de intervalos
      fechaInicio: { [Op.lt]: hasta },
      fechaFin: { [Op.gt]: desde },
    };

    if (soloVigentes) {
      where.fechaFin = { [Op.gte]: new Date(), [Op.gt]: desde };
    }

    return Reserva.findAll({
      where,
      include: [
        {
          model: Usuario,
          as: "usuario",
          attributes: ["usuarioId", "nombre"],
        },
      ],
      order: [["fechaInicio", "ASC"]],
    });
  }

  /**
   * Trae los días sin clase en el rango (cualquier comisión).
   * El filtro fino "afecta a esta comisión" lo hace _expandirHorarios.
   */
  async _obtenerDiasSinClase(desde, hasta) {
    const desdeYMD = this._fechaToYMD(desde);
    const hastaYMD = this._fechaToYMD(hasta);
    return DiaSinClase.findAll({
      where: {
        fecha: { [Op.between]: [desdeYMD, hastaYMD] },
      },
    });
  }

  /**
   * Trae los feriados institucionales en el rango.
   */
  async _obtenerFeriados(desde, hasta) {
    const desdeYMD = this._fechaToYMD(desde);
    const hastaYMD = this._fechaToYMD(hasta);
    return Feriado.findAll({
      where: {
        fecha: { [Op.between]: [desdeYMD, hastaYMD] },
      },
    });
  }

  /**
   * Convierte un horario recurrente (ej: todos los martes 8-12)
   * en eventos puntuales con fechas reales (martes 17/6, martes 24/6...).
   *
   * Algoritmo:
   *   1. Iteramos cada día del rango
   *   2. Para cada día, vemos qué número de día de semana es
   *   3. Filtramos los horarios que matchean ese día
   *   4. Por cada horario que matchea, creamos un evento con la
   *      fecha del día + la hora del horario
   *   5. Excluimos los días que están en el set de fechasExcluidas
   *   6. Si soloVigentes=true, descartamos eventos que ya terminaron
   */
  _expandirHorarios({ horarios, desde, hasta, fechasExcluidas, soloVigentes }) {
    const eventos = [];
    const ahora = new Date();

    // Vamos iterando día por día desde 'desde' hasta 'hasta'
    const cursor = new Date(desde);
    cursor.setHours(0, 0, 0, 0); // normalizar al inicio del día

    const limite = new Date(hasta);
    limite.setHours(23, 59, 59, 999); // normalizar al fin del día

    while (cursor <= limite) {
      const diaYMD = this._fechaToYMD(cursor);

      // Si el día está excluido (feriado o día sin clase), saltarlo
      if (!fechasExcluidas.has(diaYMD)) {
        const diaSemanaStr = DIAS_SEMANA[cursor.getDay()];

        // Horarios que matchean ese día de semana
        const horariosDelDia = horarios.filter(
          (h) => h.diaSemana === diaSemanaStr
        );

        for (const horario of horariosDelDia) {
          const inicio = this._combinarFechaYHora(cursor, horario.horaDesde);
          const fin = this._combinarFechaYHora(cursor, horario.horaHasta);

          // Filtrar por vigencia: si ya terminó, descartar
          if (soloVigentes && fin < ahora) continue;

          // Filtrar también: el evento entero debe quedar dentro
          // del rango pedido (puede que el primer/último día sea parcial)
          if (fin < desde || inicio > hasta) continue;

          eventos.push(this._horarioAEvento(horario, inicio, fin));
        }
      }

      // Avanzar al día siguiente
      cursor.setDate(cursor.getDate() + 1);
    }

    return eventos;
  }

  /**
   * Convierte un horario expandido a evento del formato FullCalendar.
   */
  _horarioAEvento(horario, inicio, fin) {
    const materia = horario.comision?.materia;
    const profesor = horario.comision?.profesor;

    const tituloMateria = materia?.nombre || "Cursada";
    const codigoComision = horario.comision?.codigo
      ? ` - ${horario.comision.codigo}`
      : "";
    const nombreProfesor = profesor?.nombre || "Sin docente asignado";

    return {
      // ID único combinando IDs reales + fecha. Permite distinguir
      // el mismo horario en martes 17 vs martes 24.
      id: `horario-${horario.horarioId}-${this._fechaToYMD(inicio)}`,
      tipo: "cursada",
      title: `${tituloMateria}${codigoComision}`,
      subtitulo: `Prof. ${nombreProfesor}`,
      start: inicio.toISOString(),
      end: fin.toISOString(),
      color: COLOR_CURSADA,
      detalles: {
        materia: materia?.nombre || null,
        comision: horario.comision?.codigo || null,
        docente: nombreProfesor,
        diaSemana: horario.diaSemana,
        horaDesde: horario.horaDesde,
        horaHasta: horario.horaHasta,
      },
    };
  }

  /**
   * Convierte una reserva a evento del formato FullCalendar.
   */
  _reservaAEvento(reserva) {
    return {
      id: `reserva-${reserva.reservaId}`,
      tipo: "reserva",
      title: reserva.motivo,
      subtitulo: reserva.usuario?.nombre
        ? `Reservado por: ${reserva.usuario.nombre}`
        : "Reservado",
      start: new Date(reserva.fechaInicio).toISOString(),
      end: new Date(reserva.fechaFin).toISOString(),
      color: COLOR_RESERVA,
      detalles: {
        motivo: reserva.motivo,
        descripcion: reserva.descripcion || null,
        usuario: reserva.usuario?.nombre || null,
      },
    };
  }

  // ─── Helpers de fecha ─────────────────────────────────────

  /**
   * Convierte una fecha JS a string "YYYY-MM-DD".
   * Usa la hora local del servidor (no UTC) para evitar
   * desfasajes de timezone.
   */
  _fechaToYMD(fecha) {
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  /**
   * Combina una fecha (con día) y una hora "HH:MM:SS" o "HH:MM"
   * en un único objeto Date.
   *
   * Ej: combinar(2026-06-17, "08:00") → 2026-06-17T08:00:00
   */
  _combinarFechaYHora(fecha, horaStr) {
    const partes = String(horaStr).split(":");
    const horas = parseInt(partes[0], 10) || 0;
    const minutos = parseInt(partes[1], 10) || 0;
    const segundos = parseInt(partes[2], 10) || 0;

    const resultado = new Date(fecha);
    resultado.setHours(horas, minutos, segundos, 0);
    return resultado;
  }
}

module.exports = new CalendarioOcupacionService();
