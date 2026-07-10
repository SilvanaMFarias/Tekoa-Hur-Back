// ============================================================
// controllers/importarController.js
// ============================================================
// Importa la planilla de matriculación (docentes + estudiantes).
//
// ⚠️  IMPORTANTE — REGLA DE ARQUITECTURA
// ────────────────────────────────────────────────────────────
// Este controller NO crea edificios ni aulas. Los edificios y
// aulas (con sus atributos: capacidad, equipamiento, etc.) se
// cargan por otro flujo: el importador de aulas
// (services/importarAulasService.js).
//
// La planilla de matriculación SOLO enlaza cada comisión con
// un aula que YA DEBE EXISTIR en la DB. Si el aula no existe,
// se rechaza la fila con un error claro:
//
//   "Aula JS-001 en JUSTICIA SOCIAL no existe. Cargá primero
//    el archivo de aulas o revisá que el nombre esté escrito
//    exactamente igual."
//
// Beneficios:
//   - No se pisan atributos (capacidad, equipamiento) por una
//     importación posterior.
//   - No se crean aulas "fantasma" con datos incompletos.
//   - Los errores se detectan al importar, no al usar la app.
//
// Al confirmar la importación, ADEMÁS de crear/actualizar
// comisiones, horarios y matrículas, se DEVUELVE un reporte
// detallado con contadores separados de:
//    - nuevas / actualizadas / sin cambios
// para cada entidad (docentes, comisiones, horarios, alumnos,
// matriculas).
// ============================================================

const XLSX = require("xlsx");
const bcrypt = require("bcryptjs");
const { Edificio, Aula, Profesor, Materia, Comision, Horario,
  Estudiante, Matricula, Usuario } = require("../models");
const HistorialImportacionService = require('../services/historialImportacionService');
const SALT = 10;

// ─── Helper: crear usuario si no existe (password = DNI) ─────
// Se usa tanto en la importación como en la sincronización final.
async function crearUsuarioSiNoExiste(dni, nombre, rol, email) {
  const [, created] = await Usuario.findOrCreate({
    where: { dni },
    defaults: {
      dni,
      nombre,
      email,
      password: await bcrypt.hash(dni, SALT),
      rol,
      referenciaId: dni,
      activo: true,
    },
  });
  return created;
}

// ─── Helper: sincronizar usuarios para TODOS los existentes ──
// Corre al final de cada importación para garantizar que ningún
// alumno o docente quede sin acceso, aunque ya estuviera en la DB.
async function sincronizarUsuariosExistentes() {
  let creados = 0;

  const estudiantes = await Estudiante.findAll();
  for (const est of estudiantes) {
    const ok = await crearUsuarioSiNoExiste(est.dni, est.nombre_apellido, "alumno");
    if (ok) creados++;
  }

  const profesores = await Profesor.findAll();
  for (const prof of profesores) {
    const ok = await crearUsuarioSiNoExiste(prof.dni, prof.nombre_apellido, "docente");
    if (ok) creados++;
  }

  return creados;
}

// ─── Helpers de parseo ───────────────────────────────────────
function normalizarDia(dia) {
  if (!dia) return null;
  return dia.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function excelTimeToString(val) {
  if (!val && val !== 0) return "00:00:00";
  if (typeof val === "string" && val.includes(":")) return val;
  const totalSeconds = Math.round(val * 24 * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Parser de nombre de aula ────────────────────────────────
// Usa la MISMA lógica que services/importarAulasService.js
// para garantizar que el match sea 100% consistente.
//
//   "AULA JS-001"     → { sector: "JS", numero: "001" }
//   "AULA JS-001-"    → { sector: "JS", numero: "001" }  (guion sobrante ok)
//   "AULA TA-014"     → { sector: "TA", numero: "014" }
//   "BIBLIOTECA"      → { sector: "BIBLIOTECA", numero: "UNICO" }
//
// Retorna null si el nombre es demasiado corto o inválido.
function parsearNombreAula(nombre) {
  if (!nombre) return null;
  const limpio = String(nombre).trim();
  if (limpio.length < 2) return null;

  // Intento 1: "XX-###" o "XX ###"
  const matchCodigo = limpio.match(/([A-Z]{1,4})[-\s]+(\d{1,4}[A-Z]?)/i);
  if (matchCodigo) {
    return {
      sector: matchCodigo[1].toUpperCase(),
      numero: matchCodigo[2].toUpperCase(),
    };
  }

  // Intento 2: aula única (BIBLIOTECA, GIMNASIO, etc.)
  const sectorUnico = limpio
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/\./g, "");
  return { sector: sectorUnico, numero: "UNICO" };
}

// ─── Normalizador de nombre de edificio ──────────────────────
// El Excel de aulas guarda edificios con posibles variaciones
// de mayúsculas/acentos. Buscamos case-insensitive y sin acentos.
function normalizarNombreEdificio(nombre) {
  if (!nombre) return "";
  return String(nombre)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parsearExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const wsMatriculacion = workbook.Sheets["matriculacion"];
  const matriculacion = XLSX.utils.sheet_to_json(wsMatriculacion, { header: 1 });

  const wsComisiones = workbook.Sheets["comisiones"];
  const comisionesRaw = XLSX.utils.sheet_to_json(wsComisiones, { header: 1 });

  const comisiones = [];
  for (let i = 1; i < comisionesRaw.length; i++) {
    const f = comisionesRaw[i];
    if (!f[0]) continue;
    comisiones.push({
      fila: i + 1,
      cod_comision: String(f[0]).trim(),
      docente_nombre: String(f[1]).trim(),
      docente_dni: String(f[2]).trim(),
      docente_email: String(f[3]).trim(),
      horaDesde: excelTimeToString(f[4]),
      horaHasta: excelTimeToString(f[5]),
      espacio: String(f[6]).trim(),
      edificio: String(f[7]).trim(),
      actividad: String(f[8]).trim(),
      dia: normalizarDia(String(f[9]).trim()),
    });
  }

  const estudiantes = [];
  for (let i = 1; i < matriculacion.length; i++) {
    const f = matriculacion[i];
    if (!f[0] || !f[1]) continue;
    estudiantes.push({
      fila: i + 1,
      nombre_apellido: String(f[0]).trim(),
      dni: String(f[1]).trim(),
      email: String(f[2]).trim(),
      materia: String(f[3]).trim(),
      cod_comision: String(f[4]).trim(),
      docente: String(f[5]).trim(),
    });
  }

  return { comisiones, estudiantes };
}

// ─── Validación de aulas ─────────────────────────────────────
// Recorre las comisiones del Excel, parsea cada nombre de aula
// y busca en la DB. NO crea nada.
// Retorna un mapa aula-por-clave y una lista de errores por
// aulas no encontradas.
async function resolverAulasExistentes(comisiones) {
  const aulaMap = {};        // clave "AULA JS-001" → registro Aula de la DB
  const erroresAulas = [];   // [{ fila, espacio, edificio, mensaje }]

  // Cargamos todos los edificios y aulas UNA sola vez (más eficiente
  // que un findOne por fila del Excel).
  const todosEdificios = await Edificio.findAll();
  const todasAulas = await Aula.findAll();

  // Indexamos edificios por nombre normalizado
  const edificioPorNombre = new Map();
  for (const e of todosEdificios) {
    edificioPorNombre.set(normalizarNombreEdificio(e.nombre), e);
  }

  // Indexamos aulas por (edificioId, sector, numero)
  const aulaPorClave = new Map();
  for (const a of todasAulas) {
    const clave = `${a.edificioId}::${a.sector}::${a.numero}`;
    aulaPorClave.set(clave, a);
  }

  // Deduplicamos: no reportar 10 veces la misma aula faltante.
  const yaProcesadas = new Set();

  for (const c of comisiones) {
    const claveExcel = `${c.espacio}||${c.edificio}`;
    if (yaProcesadas.has(claveExcel)) continue;
    yaProcesadas.add(claveExcel);

    // 1. Validar edificio
    const edificioKey = normalizarNombreEdificio(c.edificio);
    const edificio = edificioPorNombre.get(edificioKey);
    if (!edificio) {
      erroresAulas.push({
        fila: c.fila,
        tipo: "EDIFICIO_NO_EXISTE",
        espacio: c.espacio,
        edificio: c.edificio,
        mensaje: `El edificio "${c.edificio}" no existe. Cargá primero el archivo de aulas o revisá que el nombre esté escrito exactamente igual.`,
      });
      continue;
    }

    // 2. Parsear nombre de aula
    const parsed = parsearNombreAula(c.espacio);
    if (!parsed) {
      erroresAulas.push({
        fila: c.fila,
        tipo: "AULA_INVALIDA",
        espacio: c.espacio,
        edificio: c.edificio,
        mensaje: `El nombre del aula "${c.espacio}" no tiene formato válido. Se espera algo como "AULA JS-001".`,
      });
      continue;
    }

    // 3. Validar aula (misma clave sector + numero + edificio)
    const claveAula = `${edificio.edificioId}::${parsed.sector}::${parsed.numero}`;
    const aula = aulaPorClave.get(claveAula);
    if (!aula) {
      erroresAulas.push({
        fila: c.fila,
        tipo: "AULA_NO_EXISTE",
        espacio: c.espacio,
        edificio: c.edificio,
        mensaje: `El aula ${parsed.sector}-${parsed.numero} en "${c.edificio}" no existe. Cargá primero el archivo de aulas o revisá que el nombre esté escrito exactamente igual.`,
      });
      continue;
    }

    aulaMap[c.espacio] = aula;
  }

  return { aulaMap, erroresAulas };
}

// ─── PREVIEW ─────────────────────────────────────────────────
exports.preview = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No se recibió archivo" });

    const { comisiones, estudiantes } = parsearExcel(req.file.buffer);

    // NUEVO: validar aulas ANTES del confirmar así el admin
    // se entera de una y no pierde tiempo confirmando.
    const { erroresAulas } = await resolverAulasExistentes(comisiones);

    const edificiosUnicos = [...new Set(comisiones.map(c => c.edificio))];
    const aulasUnicas = [...new Set(comisiones.map(c => c.espacio))];
    const docentesUnicos = [...new Set(comisiones.map(c => c.docente_dni))].map(dni => {
      const c = comisiones.find(x => x.docente_dni === dni);
      return { dni, nombre: c.docente_nombre };
    });
    const materiasUnicas = [...new Set(comisiones.map(c => c.actividad))];

    res.json({
      resumen: {
        comisiones: comisiones.length,
        estudiantes: estudiantes.length,
        edificios: edificiosUnicos,
        aulas: aulasUnicas.length,
        docentes: docentesUnicos.length,
        materias: materiasUnicas,
      },
      comisiones,
      estudiantes: estudiantes.slice(0, 20),
      // NUEVO: errores de aulas encontrados en la validación.
      // Si hay alguno, el front debería mostrar un aviso y
      // NO habilitar el botón "confirmar" hasta resolverlo.
      erroresAulas,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── CONFIRMAR ───────────────────────────────────────────────
exports.confirmar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No se recibió archivo" });

    const { comisiones, estudiantes } = parsearExcel(req.file.buffer);

    // ── PASO 0 (NUEVO) — Validar que TODAS las aulas existan ──
    // Si falta aunque sea una, abortamos SIN escribir en la DB.
    // Es la garantía de que la importación no ensucia datos.
    const { aulaMap, erroresAulas } = await resolverAulasExistentes(comisiones);
    if (erroresAulas.length > 0) {
      return res.status(400).json({
        error: "No se puede importar. Hay aulas o edificios que no existen en la base de datos. Cargá primero el archivo de aulas o corregí los nombres en el Excel.",
        cantidadErroresAulas: erroresAulas.length,
        erroresAulas,
      });
    }

    // Contadores separados: nuevos vs actualizados vs sin cambios.
    const resultados = {
      profesores: { nuevos: 0, actualizados: 0, sinCambios: 0 },
      materias: { nuevos: 0, sinCambios: 0 },
      comisiones: { nuevos: 0, actualizados: 0, sinCambios: 0 },
      horarios: { nuevos: 0, actualizados: 0, sinCambios: 0 },
      estudiantes: { nuevos: 0, actualizados: 0, sinCambios: 0 },
      matriculas: { nuevos: 0, sinCambios: 0 },
      usuariosCreados: 0,
      errores: [],
    };

    // 1. Profesores (crear o actualizar nombre/email si cambió)
    const profesorMap = {};
    for (const c of comisiones) {
      if (profesorMap[c.docente_dni]) continue;

      const [prof, created] = await Profesor.findOrCreate({
        where: { dni: c.docente_dni },
        defaults: { dni: c.docente_dni, nombre_apellido: c.docente_nombre },
      });
      profesorMap[c.docente_dni] = prof;

      if (created) {
        resultados.profesores.nuevos++;
      } else if (prof.nombre_apellido !== c.docente_nombre) {
        await prof.update({ nombre_apellido: c.docente_nombre });
        resultados.profesores.actualizados++;
      } else {
        resultados.profesores.sinCambios++;
      }

      const creado = await crearUsuarioSiNoExiste(c.docente_dni, c.docente_nombre, "docente", c.docente_email);
      if (creado) resultados.usuariosCreados++;
    }

    // 2. Materias (solo crear, no hay campos que actualizar)
    const materiaMap = {};
    for (const c of comisiones) {
      if (materiaMap[c.actividad]) continue;

      const [mat, created] = await Materia.findOrCreate({
        where: { nombre: c.actividad },
        defaults: { nombre: c.actividad },
      });
      materiaMap[c.actividad] = mat;

      if (created) {
        resultados.materias.nuevos++;
      } else {
        resultados.materias.sinCambios++;
      }
    }

    // 3. Comisiones (crear o actualizar profesor si cambió)
    // La comisión se identifica por cod_comision + materia. El docente puede cambiar.
    const comisionMap = {};
    for (const c of comisiones) {
      const materia = materiaMap[c.actividad];
      const profesor = profesorMap[c.docente_dni];

      const [comision, created] = await Comision.findOrCreate({
        where: {
          cod_comision: c.cod_comision,
          materiaId: materia.materiaId,
        },
        defaults: {
          cod_comision: c.cod_comision,
          materiaId: materia.materiaId,
          profesorId: profesor.profesorId,
        },
      });
      comisionMap[c.cod_comision] = comision;

      if (created) {
        resultados.comisiones.nuevos++;
      } else if (String(comision.profesorId) !== String(profesor.profesorId)) {
        await comision.update({ profesorId: profesor.profesorId });
        resultados.comisiones.actualizados++;
      } else {
        resultados.comisiones.sinCambios++;
      }
    }

    // 4. Horarios (crear o actualizar aula/hora si cambió)
    // Un horario se identifica por (comisión + día). Si el aula, horaDesde
    // u horaHasta cambian, se ACTUALIZA (no se crea un duplicado).
    // Los horarios semanales generan automáticamente la agenda
    // recurrente en el calendario hasta fin del cuatrimestre (via
    // calendarioOcupacionService).
    for (const c of comisiones) {
      const comision = comisionMap[c.cod_comision];
      const aula = aulaMap[c.espacio];

      const [horario, created] = await Horario.findOrCreate({
        where: {
          comisionId: comision.comisionId,
          diaSemana: c.dia,
        },
        defaults: {
          diaSemana: c.dia,
          horaDesde: c.horaDesde,
          horaHasta: c.horaHasta,
          comisionId: comision.comisionId,
          aulaId: aula.aulaId,
        },
      });

      if (created) {
        resultados.horarios.nuevos++;
      } else {
        // Detectar si algo cambió
        const cambios = {};
        if (String(horario.aulaId) !== String(aula.aulaId)) cambios.aulaId = aula.aulaId;
        if (horario.horaDesde !== c.horaDesde) cambios.horaDesde = c.horaDesde;
        if (horario.horaHasta !== c.horaHasta) cambios.horaHasta = c.horaHasta;

        if (Object.keys(cambios).length > 0) {
          await horario.update(cambios);
          resultados.horarios.actualizados++;
        } else {
          resultados.horarios.sinCambios++;
        }
      }
    }

    // 5. Estudiantes + Matrículas + Usuario
    for (const estudiante of estudiantes) {
      if (!estudiante.dni || estudiante.dni === "undefined" || estudiante.dni === "NaN") continue;

      const [estud, estCreated] = await Estudiante.findOrCreate({
        where: { dni: estudiante.dni },
        defaults: { dni: estudiante.dni, nombre_apellido: estudiante.nombre_apellido },
      });

      if (estCreated) {
        resultados.estudiantes.nuevos++;
      } else if (estud.nombre_apellido !== estudiante.nombre_apellido) {
        await estud.update({ nombre_apellido: estudiante.nombre_apellido });
        resultados.estudiantes.actualizados++;
      } else {
        resultados.estudiantes.sinCambios++;
      }

      const creado = await crearUsuarioSiNoExiste(estudiante.dni, estudiante.nombre_apellido, "alumno", estudiante.email);
      if (creado) resultados.usuariosCreados++;

      const comision = comisionMap[estudiante.cod_comision];
      if (!comision) {
        resultados.errores.push({
          fila: estudiante.fila,
          dni: estudiante.dni,
          comision: estudiante.cod_comision,
          mensaje: "Comisión no encontrada"
        });
        continue;
      }

      const [, matCreated] = await Matricula.findOrCreate({
        where: { estudianteDni: estud.dni, comisionId: comision.comisionId },
        defaults: { estudianteDni: estud.dni, comisionId: comision.comisionId },
      });

      if (matCreated) {
        resultados.matriculas.nuevos++;
      } else {
        resultados.matriculas.sinCambios++;
      }
    }

    // 6. Registrar en historial de importación
    try {
      await HistorialImportacionService.registrar({
        usuarioId: req.usuario.usuarioId,
        origen: 'GESTION_ESTUDIANTIL',
        nombreArchivo: req.file.originalname,
        descripcion: 'Importación de matriculación (docentes + alumnos)',
        tipoOperacion: 'CARGA_INICIAL',
        estado: resultados.errores.length > 0 ? 'ERROR' : 'EXITOSA',
        cantidadErrores: resultados.errores.length,
        detalle: resultados,
        archivo: req.file.buffer
      });
    } catch (error) {
      console.error('Error al registrar historial de importación:', error.message);
    }

    // 7. Sincronización final — crea usuarios para alumnos/docentes
    // que ya estaban en la DB antes de esta importación.
    const sincronizados = await sincronizarUsuariosExistentes();
    resultados.usuariosCreados += sincronizados;

    res.json({
      mensaje: "Importación completada con éxito",
      resultados,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};