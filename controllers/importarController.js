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
      // Número de fila del Excel.
      // Se suma 1 porque el índice comienza en 0 y otra fila corresponde al encabezado.
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

// ─── PREVIEW ─────────────────────────────────────────────────
exports.preview = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No se recibió archivo" });

    const { comisiones, estudiantes } = parsearExcel(req.file.buffer);

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

    const resultados = {
      edificios: 0, aulas: 0, profesores: 0, materias: 0,
      comisiones: 0, horarios: 0, estudiantes: 0, matriculas: 0,
      usuariosCreados: 0,
      errores: [],
    };

    // 1. Edificios
    const edificioMap = {};
    for (const c of comisiones) {
      if (!edificioMap[c.edificio]) {
        const [edif] = await Edificio.findOrCreate({
          where: { nombre: c.edificio },
          defaults: { nombre: c.edificio },
        });
        edificioMap[c.edificio] = edif;
        resultados.edificios++;
      }
    }

    // 2. Aulas
    const aulaMap = {};
    for (const c of comisiones) {
      if (!aulaMap[c.espacio]) {
        const partes = c.espacio.replace("AULA ", "").split("-");
        const sector = partes[0] || c.espacio;
        const numero = partes[1] || "000";
        const edificio = edificioMap[c.edificio];
        const [aula] = await Aula.findOrCreate({
          where: { sector, numero, edificioId: edificio.edificioId },
          defaults: { sector, numero, edificioId: edificio.edificioId },
        });
        aulaMap[c.espacio] = aula;
        resultados.aulas++;
      }
    }

    // 3. Profesores + Usuario (password = DNI)
    const profesorMap = {};
    for (const c of comisiones) {
      if (!profesorMap[c.docente_dni]) {
        const [prof] = await Profesor.findOrCreate({
          where: { dni: c.docente_dni },
          defaults: { dni: c.docente_dni, nombre_apellido: c.docente_nombre },
        });
        profesorMap[c.docente_dni] = prof;
        resultados.profesores++;

        const creado = await crearUsuarioSiNoExiste(c.docente_dni, c.docente_nombre, "docente", c.docente_email);
        if (creado) resultados.usuariosCreados++;
      }
    }

    // 4. Materias
    const materiaMap = {};
    for (const c of comisiones) {
      if (!materiaMap[c.actividad]) {
        const [mat] = await Materia.findOrCreate({
          where: { nombre: c.actividad },
          defaults: { nombre: c.actividad },
        });
        materiaMap[c.actividad] = mat;
        resultados.materias++;
      }
    }

    // 5. Comisiones + Horarios
    const comisionMap = {};
    for (const c of comisiones) {
      const materia = materiaMap[c.actividad];
      const profesor = profesorMap[c.docente_dni];
      const [comision, created] = await Comision.findOrCreate({
        where: {
          cod_comision: c.cod_comision,
          materiaId: materia.materiaId,
          profesorId: profesor.profesorId,
        },
        defaults: {
          cod_comision: c.cod_comision,
          materiaId: materia.materiaId,
          profesorId: profesor.profesorId,
        },
      });
      if (created) resultados.comisiones++;
      comisionMap[c.cod_comision] = comision;

      const aula = aulaMap[c.espacio];
      const [, horCreated] = await Horario.findOrCreate({
        where: {
          comisionId: comision.comisionId,
          diaSemana: c.dia,
          aulaId: aula.aulaId,
        },
        defaults: {
          diaSemana: c.dia,
          horaDesde: c.horaDesde,
          horaHasta: c.horaHasta,
          comisionId: comision.comisionId,
          aulaId: aula.aulaId,
        },
      });
      if (horCreated) resultados.horarios++;
    }

    // 6. Estudiantes + Matrículas + Usuario (password = DNI)
    for (const estudiante of estudiantes) {
      if (!estudiante.dni || estudiante.dni === "undefined" || estudiante.dni === "NaN") continue;

      const [estud, estCreated] = await Estudiante.findOrCreate({
        where: { dni: estudiante.dni },
        defaults: { dni: estudiante.dni, nombre_apellido: estudiante.nombre_apellido },
      });
      if (estCreated) resultados.estudiantes++;

      const creado = await crearUsuarioSiNoExiste(estudiante.dni, estudiante.nombre_apellido, "alumno", estudiante.email);
      if (creado) resultados.usuariosCreados++;

      const comision = comisionMap[estudiante.cod_comision];
      if (!comision) {
        // Se modifica para poder incorporar la fila del excel en el mensaje de error y poder identificarla más fácilmente.
        //        resultados.errores.push(`Comisión no encontrada para ${estudiante.dni}: ${estudiante.cod_comision}`);
        resultados.errores.push({
          // Fila donde ocurrio el problema.
          fila: estudiante.fila,
          // DNI del estudiante.
          dni: estudiante.dni,
          // Comision informada en el Excel.
          comision: estudiante.cod_comision,
          // Descripción del error.
          mensaje: "Comisión no encontrada"
        }); continue;
      }
      await Matricula.findOrCreate({
        where: { estudianteDni: estud.dni, comisionId: comision.comisionId },
        defaults: { estudianteDni: estud.dni, comisionId: comision.comisionId },
      });
      resultados.matriculas++;
    }

    // 7. Registrar en historial de importación
    try {
      await HistorialImportacionService.registrar({
        usuarioId: req.usuario.usuarioId,
        origen: 'GESTION_ESTUDIANTIL',
        nombreArchivo: req.file.originalname,
        descripcion: 'Importación inicial de Gestión Estudiantil',
        tipoOperacion: 'CARGA_INICIAL',
        estado: resultados.errores.length > 0
          ? 'ERROR'
          : 'EXITOSA',
        cantidadErrores: resultados.errores.length,
        detalle: resultados,
        archivo: req.file.buffer
      });

    } catch (error) {
      console.error(
        'Error al registrar historial de importación:',
        error.message
      );

    }

    // ✅ Sincronización final — crea usuarios para alumnos/docentes que
    // ya estaban en la DB antes de esta importación y no tenían usuario.
    // Esto garantiza que NUNCA sea necesario correr seeds manualmente.
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
