// ============================================================
// services/reservaService.js
// ============================================================
// Service de Reservas de Aulas
//
// Centraliza TODA la lógica de negocio relacionada con reservas:
//   - CRUD completo (listar, ver, crear, editar, cancelar)
//   - Detección de conflictos contra cursadas y otras reservas
//   - Aplicación de la regla de negocio:
//       * conflicto con CURSADA
//       * conflicto con RESERVA  
//
// REGLA DE NEGOCIO PRINCIPAL:
//   La cursada tiene PRIORIDAD sobre cualquier reserva.
//   Si alguien quiere reservar un aula que tiene una cursada en
//   ese horario, debe moverse la cursada primero (o cambiar el
//   horario de la reserva).
//
// Esta lógica NO está en el controller ni en las routes:
// el controller solo traduce HTTP, el service decide.
// ============================================================

const { Op } = require("sequelize");
const {
  Reserva,
  Horario,
  Comision,
  Materia,
  Profesor,
  Aula,
  Edificio,
  Usuario,
  DiaSinClase,
  Feriado,
} = require("../models");
const AppError = require("../errors/AppError");

// ─── Mapeo de día semana (igual que en calendarioOcupacionService) ───
// Mantenemos el mismo criterio: día como string en español sin tilde
// excepto "Miércoles" y "Sábado" que sí llevan. Esto debe coincidir
// con cómo se guarda Horario.diaSemana en la base.
const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

// ─── Buffer configurable entre reservas ──────────────────────
// Minutos de margen que se exigen entre dos eventos para considerar
// que NO se solapan. Sirve para que el aula se pueda preparar entre
// una clase/reserva y la siguiente.
//
// Se configura por variable de entorno RESERVA_BUFFER_MINUTOS.
// Si no se define, default = 0 (sin buffer, algoritmo puro).
//
// Ejemplo:
//   .env → RESERVA_BUFFER_MINUTOS=15
//   Con buffer de 15min, una reserva 14-16 y otra 16:10-18 SE SOLAPAN
//   porque queda menos de 15min entre ambas.
const BUFFER_MINUTOS = parseInt(process.env.RESERVA_BUFFER_MINUTOS, 10) || 0;

class ReservaService {
  // ============================================================
  // LISTAR
  // ============================================================
  /**
   * Lista reservas con filtros opcionales.
   *
   * @param {Object} filtros
   * @param {string} [filtros.aulaId]     - Filtrar por aula
   * @param {string} [filtros.estado]     - "confirmada" | "cancelada"
   * @param {Date}   [filtros.desde]      - Reservas que terminen >= desde
   * @param {Date}   [filtros.hasta]      - Reservas que empiecen <= hasta
   * @returns {Promise<Reserva[]>}
   */
  async listar(filtros = {}) {
    const where = {};

    // Filtro por aula (opcional)
    if (filtros.aulaId) where.aulaId = filtros.aulaId;

    // Filtro por estado (opcional). Si no viene, devolvemos todas.
    if (filtros.estado) where.estado = filtros.estado;

    // Filtro por rango de fechas (opcional).
    // Aplica la misma lógica de solapamiento de intervalos:
    // queremos reservas que se crucen con [desde, hasta].
    if (filtros.desde && filtros.hasta) {
      where.fechaInicio = { [Op.lt]: filtros.hasta }; // A.inicio < B.fin
      where.fechaFin = { [Op.gt]: filtros.desde }; // A.fin > B.inicio
    }

    return Reserva.findAll({
      where,
      include: [
        {
          model: Aula,
          as: "aula",
          include: [{ model: Edificio, as: "edificio" }],
        },
        {
          model: Usuario,
          as: "usuario",
          attributes: ["usuarioId", "nombre", "dni"],
        },
      ],
      order: [["fechaInicio", "ASC"]],
    });
  }

  // ============================================================
  // OBTENER POR ID
  // ============================================================
  async obtenerPorId(reservaId) {
    if (!reservaId) throw AppError.badRequest("reservaId es requerido");

    const reserva = await Reserva.findByPk(reservaId, {
      include: [
        {
          model: Aula,
          as: "aula",
          include: [{ model: Edificio, as: "edificio" }],
        },
        {
          model: Usuario,
          as: "usuario",
          attributes: ["usuarioId", "nombre", "dni"],
        },
      ],
    });

    if (!reserva) throw AppError.notFound("Reserva no encontrada");
    return reserva;
  }

  // ============================================================
  // VERIFICAR CONFLICTOS  MÉTODO CLAVE
  // ============================================================
  /**
   * Detecta si una franja [fechaInicio, fechaFin] en un aula choca
   * con cursadas u otras reservas.
   *
   * ALGORITMO DE SOLAPAMIENTO DE INTERVALOS:
   *   Dos rangos [A.inicio, A.fin] y [B.inicio, B.fin] se solapan si:
   *       A.inicio < B.fin  Y  A.fin > B.inicio
   *
   * @param {Object} params
   * @param {string} params.aulaId             - UUID del aula
   * @param {Date}   params.fechaInicio        - Inicio de la franja propuesta
   * @param {Date}   params.fechaFin           - Fin de la franja propuesta
   * @param {string} [params.reservaIdExcluir] - Para edición: ignorar esta reserva
   * @returns {Promise<{
   *   hayConflictos: boolean,
   *   conflictosCursadas: Array,   // → BLOQUEAN (hard conflict)
   *   conflictosReservas: Array    // → solo ADVIERTEN (soft conflict)
   * }>}
   */
  async verificarConflictos({ aulaId, fechaInicio, fechaFin, reservaIdExcluir }) {
    // ── Validaciones de entrada ────────────────────────────
    if (!aulaId) throw AppError.badRequest("aulaId es requerido");

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      throw AppError.badRequest("fechaInicio y fechaFin deben ser fechas válidas");
    }
    if (inicio >= fin) {
      throw AppError.badRequest("fechaInicio debe ser anterior a fechaFin");
    }

    // ── 1. Verificar que el aula exista ────────────────────
    const aula = await Aula.findByPk(aulaId);
    if (!aula) throw AppError.notFound("Aula no encontrada");

    // ── 1.5. Aplicar el BUFFER configurable ────────────────
    // Expandimos el rango propuesto hacia ambos lados.
    // Si el buffer es 15min y el usuario propone 14:00-16:00,
    // internamente chequeamos como si fuera 13:45-16:15.
    // Esto hace que cualquier cursada/reserva dentro de esos
    // 15min adicionales se detecte como conflicto.
    const inicioConBuffer = new Date(inicio);
    inicioConBuffer.setMinutes(inicioConBuffer.getMinutes() - BUFFER_MINUTOS);

    const finConBuffer = new Date(fin);
    finConBuffer.setMinutes(finConBuffer.getMinutes() + BUFFER_MINUTOS);

    // ── 2. Cargar excepciones (días sin clase y feriados) ──
    // Estas fechas se descartan al chequear cursadas: si el horario
    // recurrente cae en un feriado, no es un conflicto real.
    const [diasSinClase, feriados] = await Promise.all([
      DiaSinClase.findAll({
        where: {
          fecha: { [Op.between]: [inicio, fin] },
        },
      }),
      Feriado.findAll({
        where: {
          fecha: { [Op.between]: [inicio, fin] },
        },
      }),
    ]);

    const fechasExcluidas = new Set([
      ...diasSinClase.map((d) => this._fechaAClave(d.fecha)),
      ...feriados.map((f) => this._fechaAClave(f.fecha)),
    ]);

    // ── 3. Detectar conflictos con CURSADAS ────────────────
    // Las cursadas son recurrentes (todos los lunes 14-16). Hay que
    // expandir cada horario a las fechas concretas dentro del rango
    // [inicio, fin] y ver si alguna se cruza.
    // Pasamos el rango CON buffer para que se detecten cursadas dentro
    // del margen de seguridad.
    const conflictosCursadas = await this._detectarConflictosCursadas({
      aulaId,
      inicio: inicioConBuffer,
      fin: finConBuffer,
      fechasExcluidas,
    });

    // ── 4. Detectar conflictos con RESERVAS ────────────────
    // Las reservas ya están guardadas con fechas concretas, así que
    // basta una query con la condición de solapamiento.
    const conflictosReservas = await this._detectarConflictosReservas({
      aulaId,
      inicio: inicioConBuffer,
      fin: finConBuffer,
      reservaIdExcluir,
    });

    return {
      hayConflictos:
        conflictosCursadas.length > 0 || conflictosReservas.length > 0,
      conflictosCursadas,
      conflictosReservas,
      bufferMinutosAplicado: BUFFER_MINUTOS, // ← informativo para el frontend
    };
  }

  // ============================================================
  // CREAR
  // ============================================================
  /**
   * Crea una reserva.
   *
   * Antes de crear, verifica conflictos.
   *
   * REGLA:
   *   - Conflicto con cursada  → BLOQUEA siempre.
   *   - Conflicto con reserva  → BLOQUEA siempre (antes se podía forzar).
   *
   * Si hay cualquier conflicto, se exige al admin mover una de las dos
   * antes de crear la nueva. Esto elimina ambigüedad: dos eventos NUNCA
   * pueden compartir un aula al mismo tiempo.
   *
   * @param {Object} datos
   * @param {string} datos.aulaId
   * @param {string} datos.motivo
   * @param {Date}   datos.fechaInicio
   * @param {Date}   datos.fechaFin
   * @param {string} [datos.descripcion]
   * @param {string} usuarioId               - Usuario que crea (del JWT)
   */
  async crear(datos, usuarioId) {
    if (!usuarioId) throw AppError.badRequest("usuarioId es requerido");
    if (!datos.motivo || datos.motivo.trim().length < 3) {
      throw AppError.badRequest("El motivo debe tener al menos 3 caracteres");
    }

    // ── Verificar conflictos ANTES de insertar ────────────
    const conflictos = await this.verificarConflictos({
      aulaId: datos.aulaId,
      fechaInicio: datos.fechaInicio,
      fechaFin: datos.fechaFin,
    });

    // BLOQUEO por cursada
    if (conflictos.conflictosCursadas.length > 0) {
      const err = AppError.conflict(
        "El aula tiene una cursada en ese horario. Cambiá la cursada de aula o elegí otra franja.",
        "CONFLICTO_CURSADA"
      );
      err.detalles = { conflictos };
      throw err;
    }

    // BLOQUEO por reserva (ya NO se puede forzar)
    if (conflictos.conflictosReservas.length > 0) {
      const err = AppError.conflict(
        "Ya existe otra reserva en ese horario. Cambiá una de las dos antes de continuar.",
        "CONFLICTO_RESERVA"
      );
      err.detalles = { conflictos };
      throw err;
    }

    // ── Crear la reserva ──────────────────────────────────
    const reserva = await Reserva.create({
      aulaId: datos.aulaId,
      usuarioId,
      motivo: datos.motivo.trim(),
      fechaInicio: datos.fechaInicio,
      fechaFin: datos.fechaFin,
      descripcion: datos.descripcion?.trim() || null,
      estado: "confirmada",
    });

    return this.obtenerPorId(reserva.reservaId);
  }

  // ============================================================
  // ACTUALIZAR
  // ============================================================
  /**
   * Edita una reserva existente.
   * Misma lógica de conflictos que crear, pero excluyendo la
   * propia reserva del chequeo (sino siempre se "choca consigo misma").
   */
  async actualizar(reservaId, datos) {
    const reserva = await this.obtenerPorId(reservaId);

    if (reserva.estado === "cancelada") {
      throw AppError.badRequest("No se puede editar una reserva cancelada");
    }

    // Si cambian el aula o las fechas, re-validamos conflictos.
    const cambiaAulaOFecha =
      (datos.aulaId && datos.aulaId !== reserva.aulaId) ||
      (datos.fechaInicio &&
        new Date(datos.fechaInicio).getTime() !==
          new Date(reserva.fechaInicio).getTime()) ||
      (datos.fechaFin &&
        new Date(datos.fechaFin).getTime() !==
          new Date(reserva.fechaFin).getTime());

    if (cambiaAulaOFecha) {
      const conflictos = await this.verificarConflictos({
        aulaId: datos.aulaId || reserva.aulaId,
        fechaInicio: datos.fechaInicio || reserva.fechaInicio,
        fechaFin: datos.fechaFin || reserva.fechaFin,
        reservaIdExcluir: reservaId, // ← clave: nos excluimos
      });

      if (conflictos.conflictosCursadas.length > 0) {
        const err = AppError.conflict(
          "El aula tiene una cursada en ese horario. Cambiá la cursada de aula o elegí otra franja.",
          "CONFLICTO_CURSADA"
        );
        err.detalles = { conflictos };
        throw err;
      }

      if (conflictos.conflictosReservas.length > 0) {
        const err = AppError.conflict(
          "Ya existe otra reserva en ese horario. Cambiá una de las dos antes de continuar.",
          "CONFLICTO_RESERVA"
        );
        err.detalles = { conflictos };
        throw err;
      }
    }

    // ── Actualizar campos permitidos ──────────────────────
    if (datos.aulaId !== undefined) reserva.aulaId = datos.aulaId;
    if (datos.motivo !== undefined) reserva.motivo = datos.motivo.trim();
    if (datos.fechaInicio !== undefined) reserva.fechaInicio = datos.fechaInicio;
    if (datos.fechaFin !== undefined) reserva.fechaFin = datos.fechaFin;
    if (datos.descripcion !== undefined) {
      reserva.descripcion = datos.descripcion?.trim() || null;
    }

    await reserva.save();
    return this.obtenerPorId(reservaId);
  }

  // ============================================================
  // CANCELAR (soft delete)
  // ============================================================
  /**
   * Marca la reserva como "cancelada".
   * No la borra de la BD — queda como histórico.
   */
  async cancelar(reservaId) {
    const reserva = await this.obtenerPorId(reservaId);

    if (reserva.estado === "cancelada") {
      throw AppError.badRequest("La reserva ya está cancelada");
    }

    reserva.estado = "cancelada";
    await reserva.save();
    return reserva;
  }

  // ============================================================
  // OBTENER OCUPACIÓN GLOBAL (todas las aulas)
  // ============================================================
  /**
   * Devuelve los eventos de TODAS las aulas en un rango de fechas.
   * Opcionalmente filtra por edificio.
   *
   * Cada evento incluye `extendedProps.aula` con sector/numero/edificio
   * para que el calendario sepa de qué aula es.
   *
   * Estrategia:
   *   1. Listar las aulas (filtrando por edificio si corresponde)
   *   2. Disparar Promise.all sobre todas las aulas
   *   3. Aplanar el resultado en un solo array
   *
   * @param {Object} params
   * @param {Date}   params.desde
   * @param {Date}   params.hasta
   * @param {string} [params.edificioId]   - Filtro opcional
   * @returns {Promise<{aulas, eventos}>}
   */
  async obtenerOcupacionGlobal({ desde, hasta, edificioId }) {
    if (!(desde instanceof Date) || !(hasta instanceof Date)) {
      throw AppError.badRequest("desde y hasta deben ser fechas válidas");
    }
    if (desde > hasta) {
      throw AppError.badRequest("desde debe ser anterior a hasta");
    }

    // 1. Traer aulas (con o sin filtro de edificio)
    const whereAulas = {};
    if (edificioId) whereAulas.edificioId = edificioId;

    const aulas = await Aula.findAll({
      where: whereAulas,
      include: [{ model: Edificio, as: "edificio" }],
      order: [["sector", "ASC"], ["numero", "ASC"]],
    });

    // 2. Para cada aula, calcular sus eventos en el rango.
    //    Reutilizamos el calendarioOcupacionService para no duplicar lógica.
    //    Lo requerimos acá adentro para evitar dependencias circulares.
    const calendarioOcupacionService = require("./calendarioOcupacionService");

    const resultados = await Promise.all(
      aulas.map(async (aula) => {
        try {
          const data = await calendarioOcupacionService.obtenerOcupacion({
            aulaId: aula.aulaId,
            desde,
            hasta,
            soloVigentes: false,
          });
          // Inyectamos info del aula a cada evento para distinguirlas
          // en el calendario unificado.
          return (data.eventos || []).map((ev) => ({
            ...ev,
            // Sufijo identificador en el título: "[A-101] Reunión"
            title: `[${aula.sector}-${aula.numero}] ${ev.title}`,
            extendedProps: {
              ...(ev.extendedProps || {}),
              aulaId: aula.aulaId,
              aula: {
                sector: aula.sector,
                numero: aula.numero,
                edificio: aula.edificio?.nombre || null,
              },
            },
          }));
        } catch (e) {
          // Si una aula falla, no rompemos toda la consulta.
          console.error(`Error cargando ocupación de aula ${aula.aulaId}:`, e.message);
          return [];
        }
      })
    );

    // 3. Aplanar y ordenar por fecha
    const eventos = resultados.flat().sort(
      (a, b) => new Date(a.start) - new Date(b.start)
    );

    return {
      aulas: aulas.map((a) => ({
        aulaId: a.aulaId,
        sector: a.sector,
        numero: a.numero,
        edificio: a.edificio?.nombre || null,
      })),
      eventos,
    };
  }

  // ════════════════════════════════════════════════════════════
  // MÉTODOS PRIVADOS (helpers internos, no se exponen al controller)
  // ════════════════════════════════════════════════════════════

  /**
   * Detecta cursadas (horarios recurrentes) que se solapan con
   * el rango [inicio, fin] en el aula dada.
   *
   * Como los horarios son recurrentes, hay que expandirlos a fechas
   * concretas dentro del rango y aplicar el algoritmo de solapamiento.
   */
  async _detectarConflictosCursadas({ aulaId, inicio, fin, fechasExcluidas }) {
    // Traemos todos los horarios del aula (con info de la comisión)
    const horarios = await Horario.findAll({
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

    const conflictos = [];

    // Para cada horario, recorremos día por día el rango [inicio, fin]
    // y vemos si ese día corresponde al día de la semana del horario.
    for (const horario of horarios) {
      const diaSemanaIdx = DIAS_SEMANA.findIndex(
        (d) => this._normalizar(d) === this._normalizar(horario.diaSemana || "")
      );
      if (diaSemanaIdx === -1) continue;

      // Recorremos día por día
      const cursor = new Date(inicio);
      cursor.setHours(0, 0, 0, 0);
      const limite = new Date(fin);

      while (cursor <= limite) {
        if (cursor.getDay() === diaSemanaIdx) {
          const claveFecha = this._fechaAClave(cursor);

          // Si es feriado o día sin clase, no es conflicto
          if (!fechasExcluidas.has(claveFecha)) {
            // Construimos las fechas exactas de la cursada ese día
            const [hDesdeH, hDesdeM] = horario.horaDesde.split(":").map(Number);
            const [hHastaH, hHastaM] = horario.horaHasta.split(":").map(Number);

            const cursadaInicio = new Date(cursor);
            cursadaInicio.setHours(hDesdeH, hDesdeM, 0, 0);

            const cursadaFin = new Date(cursor);
            cursadaFin.setHours(hHastaH, hHastaM, 0, 0);

            // APLICAMOS EL ALGORITMO DE SOLAPAMIENTO
            // Para cada cursada, expande el horario recurrente a fechas concretas y aplica la fórmula 
            // contra el rango propuesto.
            if (cursadaInicio < fin && cursadaFin > inicio) {
              conflictos.push({
                tipo: "cursada",
                materia: horario.comision?.materia?.nombre || "Sin materia",
                comision: horario.comision?.cod_comision || "Sin código",
                docente: horario.comision?.profesor
                  ? `${horario.comision.profesor.apellido}, ${horario.comision.profesor.nombre}`
                  : "Sin docente",
                fechaInicio: cursadaInicio.toISOString(),
                fechaFin: cursadaFin.toISOString(),
                diaSemana: horario.diaSemana,
              });
            }
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    return conflictos;
  }

  /**
   * Detecta reservas existentes que se solapan con el rango propuesto.
   * Usa una query directa con la condición de solapamiento.
   */
  async _detectarConflictosReservas({ aulaId, inicio, fin, reservaIdExcluir }) {
    const where = {
      aulaId,
      estado: "confirmada", // las canceladas no cuentan
      // Condición de solapamiento traducida a Sequelize:
      // fechaInicio < fin  AND  fechaFin > inicio
      fechaInicio: { [Op.lt]: fin },  // operador de sequelize equivalente a <
      fechaFin: { [Op.gt]: inicio }, // operador de sequelize equivalente a >
    };

    // Si estamos editando, excluir la reserva actual
    if (reservaIdExcluir) {
      where.reservaId = { [Op.ne]: reservaIdExcluir };
    }
    //  Una sola query SQL que devuelve todas las reservas que se cruzan. 
    // PostgreSQL ejecuta la condición de solapamiento directamente.
    const reservas = await Reserva.findAll({
      where,
      include: [
        { model: Usuario, as: "usuario", attributes: ["nombre"] },
      ],
    });

    return reservas.map((r) => ({
      tipo: "reserva",
      reservaId: r.reservaId,
      motivo: r.motivo,
      usuario: r.usuario?.nombre || "Desconocido",
      fechaInicio: r.fechaInicio,
      fechaFin: r.fechaFin,
    }));
  }

  /**
   * Convierte un Date a clave string YYYY-MM-DD para usar en el Set
   * de fechas excluidas (feriados/días sin clase).
   */
  _fechaAClave(fecha) {
    const d = new Date(fecha);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  /**
   * Normaliza strings para comparar días de la semana sin importar
   * tildes ni mayúsculas. "Miércoles" → "miercoles".
   */
  _normalizar(str) {
    return String(str)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }
}

module.exports = new ReservaService();
