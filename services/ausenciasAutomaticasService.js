/**
 * Servicio automática de ausencias.
 *
 * Objetivo:
 * Generar automáticamente registros de asistencia con estado AUSENTE
 * para aquellos estudiantes matriculados en una comisión que no hayan
 * registrado asistencia al finalizar la clase.
 *
 * Funcionamiento:
 * - Se ejecuta periódicamente.
 * - Verifica qué clases del día ya finalizaron.
 * - Obtiene estudiantes matriculados y asistencias registradas.
 * - Genera registros AUSENTE para los estudiantes faltantes.
 */

const { Asistencia, Horario, Matricula } = require("../models");
const guaraniService = require("./guaraniService");

/**
 * Período académico de Tekoa obtenido desde variables de entorno.
 * Si no existe la variable se utiliza el valor 256.
 */
const PERIODO_TEKOA = process.env.GUARANI_PERIODO_TEKOA || "256";

/**
 * Zona horaria utilizada para todas las comparaciones de fechas y horarios.
 */
const TIME_ZONE = process.env.APP_TIME_ZONE || "America/Argentina/Buenos_Aires";

/**
 * Cada cuánto tiempo (en minutos) se ejecutará el proceso automático.
 */
const INTERVALO_MINUTOS = Number(
    process.env.AUSENCIAS_AUTO_INTERVALO_MINUTOS || 15
);

/**
 * Traducción de los días devueltos por Intl.DateTimeFormat
 * al formato utilizado en la base de datos.
 */
const DIAS_SEMANA = {
    sunday: "domingo",
    monday: "lunes",
    tuesday: "martes",
    wednesday: "miercoles",
    thursday: "jueves",
    friday: "viernes",
    saturday: "sabado",
};

/**
 * Variables utilizadas para cachear el período académico y evitar consultar Guaraní constantemente.
 */
let periodoCache = null;
let periodoCacheHasta = 0;

/**
 * Referencia al timer que ejecuta el proceso periódico.
 */
let timer = null;

/**
 * Flag para evitar ejecuciones simultáneas.
 */
let ejecutando = false;

/**
 * Normaliza un día de semana:
 * - elimina acentos
 * - elimina espacios
 * - convierte a minúsculas
 *
 * Ejemplo:
 * "Miércoles" -> "miercoles"
 */
function normalizarDiaSemana(diaSemana) {
    return String(diaSemana ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Convierte una hora al formato HH:mm.
 *
 * Ejemplo:
 * "18:30:00" -> "18:30"
 */
function normalizarHora(hora) {
    return String(hora ?? "").slice(0, 5);
}

/**
 * Obtiene fecha, hora y día de semana actuales utilizando la zona horaria configurada.
 *
 * Devuelve:
 * {
 *   fecha: "2026-06-03",
 *   hora: "18:30",
 *   diaSemana: "miercoles"
 * }
 */
function obtenerFechaHoraActual() {
    const now = new Date();

    const partes = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        weekday: "long",
        hour12: false,
    }).formatToParts(now);

    const valores = Object.fromEntries(
        partes.map(parte => [parte.type, parte.value])
    );

    return {
        fecha: `${valores.year}-${valores.month}-${valores.day}`,
        hora: `${valores.hour}:${valores.minute}`,
        diaSemana: DIAS_SEMANA[valores.weekday?.toLowerCase()] || "",
    };
}

/**
 * Obtiene desde Guaraní la información del período académico configurado para Tekoa.
 *
 * Utiliza cache durante 6 horas para evitar llamadas repetidas.
 */
async function obtenerPeriodoTekoa() {
    const now = Date.now();

    // Si existe un valor cacheado y todavía es válido,
    // se devuelve directamente.
    if (periodoCache && now < periodoCacheHasta) {
        return periodoCache;
    }

    const periodos = await guaraniService.getPeriodosTekoa();

    periodoCache = Array.isArray(periodos)
    ? periodos.find(
        p => String(p.periodo) === String(PERIODO_TEKOA)
    )
    : null;

    // Cache válido por 6 horas.
    periodoCacheHasta = now + 6 * 60 * 60 * 1000;

    return periodoCache;
}

/**
 * Verifica si una fecha se encuentra dentro
 * del período académico vigente.
 */
function fechaDentroDelPeriodo(fecha, periodo) {
    return Boolean(
        fecha &&
        periodo?.fecha_inicio_dictado &&
        periodo?.fecha_fin_dictado &&
        fecha >= periodo.fecha_inicio_dictado &&
        fecha <= periodo.fecha_fin_dictado
    );
}

/**
 * Genera registros AUSENTE para todos los estudiantes
 * matriculados que no registraron asistencia.
 *
 * Proceso:
 * 1. Obtiene todas las matrículas de la comisión.
 * 2. Obtiene todas las asistencias ya registradas.
 * 3. Detecta qué estudiantes no tienen asistencia.
 * 4. Inserta registros AUSENTE para ellos.
 */
async function consolidarAusentes({ comisionId, fecha }) {
    // Estudiantes inscriptos en la comisión.
    const matriculas = await Matricula.findAll({
        where: { comisionId },
    });

    // Asistencias registradas para esa fecha.
    const registros = await Asistencia.findAll({
        where: {
            comisionId,
            fecha,
            tipoUsuario: "ESTUDIANTE",
        },
    });

    // DNI de estudiantes que sí registraron asistencia.
    const registrados = new Set(
        registros.map(r => String(r.usuarioId).trim())
    );

    const horaRegistro = obtenerFechaHoraActual().hora;

    // Estudiantes sin asistencia -> AUSENTE.
    const ausentes = matriculas
    .filter(
        m => !registrados.has(String(m.estudianteDni).trim())
    )
    .map(m => ({
        usuarioId: String(m.estudianteDni).trim(),
               tipoUsuario: "ESTUDIANTE",
               comisionId,
               fecha,
               horaRegistro,
               estado: "AUSENTE",
    }));

    // Inserta los registros faltantes.
    if (ausentes.length > 0) {
        await Asistencia.bulkCreate(ausentes, {
            ignoreDuplicates: true,
        });
    }

    return {
        creados: ausentes.length,
    };
}

/**
 * Busca todas las clases que ya finalizaron
 * para el día actual y consolida automáticamente
 * las ausencias de cada comisión.
 */
async function consolidarClasesFinalizadas() {
    const { fecha, hora, diaSemana } =
    obtenerFechaHoraActual();

    const periodo = await obtenerPeriodoTekoa();

    // No hacer nada fuera del período académico.
    if (!fechaDentroDelPeriodo(fecha, periodo)) {
        return {
            fecha,
            procesadas: 0,
            creados: 0,
        };
    }

    // Obtener todos los horarios cargados.
    const horarios = await Horario.findAll();

    /**
     * Comisiones cuya clase:
     * - corresponde al día actual
     * - ya finalizó (horaHasta <= hora actual)
     */
    const comisionesFinalizadas = [
        ...new Set(
            horarios
            .filter(
                h =>
                normalizarDiaSemana(h.diaSemana) ===
                diaSemana &&
                normalizarHora(h.horaHasta) <= hora
            )
            .map(h => h.comisionId)
        ),
    ];

    let creados = 0;

    // Generar ausencias para cada comisión finalizada.
    for (const comisionId of comisionesFinalizadas) {
        const resultado = await consolidarAusentes({
            comisionId,
            fecha,
        });

        creados += resultado.creados;
    }

    return {
        fecha,
        procesadas: comisionesFinalizadas.length,
        creados,
    };
}

/**
 * Inicia el proceso automático.
 *
 * El proceso:
 * - corre inmediatamente al iniciar la aplicación
 * - vuelve a ejecutarse cada N minutos
 * - evita ejecuciones simultáneas
 */
function iniciar() {
    // No iniciar si ya existe un timer
    // o si fue deshabilitado por configuración.
    if (
        timer ||
        process.env.AUSENCIAS_AUTO_ENABLED === "false"
    ) {
        return;
    }

    const ejecutar = async () => {
        // Evita que se ejecuten dos procesos a la vez.
        if (ejecutando) return;

        ejecutando = true;

        try {
            const resultado =
            await consolidarClasesFinalizadas();

            // Log solamente cuando hubo trabajo realizado.
            if (
                resultado.procesadas > 0 ||
                resultado.creados > 0
            ) {
                console.log(
                    `Ausencias automaticas: ${resultado.procesadas} comisiones, ${resultado.creados} ausentes creados (${resultado.fecha}).`
                );
            }
        } catch (err) {
            console.error(
                "Error consolidando ausencias automaticas:",
                err.message
            );
        } finally {
            ejecutando = false;
        }
    };

    // Primera ejecución al arrancar la aplicación.
    ejecutar();

    // Ejecuciones periódicas.
    timer = setInterval(
        ejecutar,
        INTERVALO_MINUTOS * 60 * 1000
    );
}

/**
 * Métodos públicos del servicio.
 */
module.exports = {
    consolidarAusentes,
    consolidarClasesFinalizadas,
    iniciar,
};
