const XLSX = require("xlsx");
const { Edificio, Aula, Profesor, Materia, Comision, Horario, Estudiante, Matricula } = require("../models");

// 🔹 Normalizar días (CLAVE)
function normalizarDia(dia) {
  if (!dia) return null;

  return dia
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// 🔹 Conversión de hora Excel
function excelTimeToString(val) {
  if (!val && val !== 0) return "00:00:00";
  if (typeof val === "string" && val.includes(":")) return val;

  const totalSeconds = Math.round(val * 24 * 3600);
  const horas = Math.floor(totalSeconds / 3600);
  const minutos = Math.floor((totalSeconds % 3600) / 60);
  const segundos = totalSeconds % 60;

  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}

// 🔹 Parseo del Excel
function parsearExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const wsMatriculacion = workbook.Sheets["matriculacion"];
  const matriculacion = XLSX.utils.sheet_to_json(wsMatriculacion, { header: 1 });

  const wsComisiones = workbook.Sheets["comisiones"];
  const comisionesRaw = XLSX.utils.sheet_to_json(wsComisiones, { header: 1 });

  const comisiones = [];

  for (let i = 1; i < comisionesRaw.length; i++) {
    const fila = comisionesRaw[i];
    if (!fila[0]) continue;

    comisiones.push({
      cod_comision: String(fila[0]).trim(),
      docente_nombre: String(fila[1]).trim(),
      docente_dni: String(fila[2]).trim(),
      horaDesde: excelTimeToString(fila[3]),
      horaHasta: excelTimeToString(fila[4]),
      espacio: String(fila[5]).trim(),
      edificio: String(fila[6]).trim(),
      actividad: String(fila[7]).trim(),
      dia: normalizarDia(String(fila[8]).trim()), // 🔥 NORMALIZADO
    });
  }

  const estudiantes = [];

  for (let i = 1; i < matriculacion.length; i++) {
    const fila = matriculacion[i];
    if (!fila[0] || !fila[1]) continue;

    estudiantes.push({
      nombre_apellido: String(fila[0]).trim(),
      dni: String(fila[1]).trim(),
      materia: String(fila[2]).trim(),
      cod_comision: String(fila[3]).trim(),
      docente: String(fila[4]).trim(),
    });
  }

  return { comisiones, estudiantes };
}

// 🔹 PREVIEW
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

// 🔹 CONFIRMAR
exports.confirmar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No se recibió archivo" });

    const { comisiones, estudiantes } = parsearExcel(req.file.buffer);

    const resultados = {
      edificios: 0,
      aulas: 0,
      profesores: 0,
      materias: 0,
      comisiones: 0,
      horarios: 0,
      estudiantes: 0,
      matriculas: 0,
      errores: []
    };

    // 1. Edificios
    const edificioMap = {};
    for (const c of comisiones) {
      if (!edificioMap[c.edificio]) {
        const [edif] = await Edificio.findOrCreate({
          where: { nombre: c.edificio },
          defaults: { nombre: c.edificio }
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
          defaults: { sector, numero, edificioId: edificio.edificioId }
        });

        aulaMap[c.espacio] = aula;
        resultados.aulas++;
      }
    }

    // 3. Profesores
    const profesorMap = {};
    for (const c of comisiones) {
      if (!profesorMap[c.docente_dni]) {
        const [prof] = await Profesor.findOrCreate({
          where: { dni: c.docente_dni },
          defaults: { dni: c.docente_dni, nombre_apellido: c.docente_nombre }
        });

        profesorMap[c.docente_dni] = prof;
        resultados.profesores++;
      }
    }

    // 4. Materias
    const materiaMap = {};
    for (const c of comisiones) {
      if (!materiaMap[c.actividad]) {
        const [mat] = await Materia.findOrCreate({
          where: { nombre: c.actividad },
          defaults: { nombre: c.actividad }
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
          profesorId: profesor.profesorId
        },
        defaults: {
          cod_comision: c.cod_comision,
          materiaId: materia.materiaId,
          profesorId: profesor.profesorId
        }
      });

      if (created) resultados.comisiones++;
      comisionMap[c.cod_comision] = comision;

      const aula = aulaMap[c.espacio];

      const [, horCreated] = await Horario.findOrCreate({
        where: {
          comisionId: comision.comisionId,
          diaSemana: c.dia, // 🔥 YA NORMALIZADO
          aulaId: aula.aulaId
        },
        defaults: {
          diaSemana: c.dia,
          horaDesde: c.horaDesde,
          horaHasta: c.horaHasta,
          comisionId: comision.comisionId,
          aulaId: aula.aulaId,
        }
      });

      if (horCreated) resultados.horarios++;
    }

    // 6. Estudiantes + Matrículas
    for (const e of estudiantes) {
      if (!e.dni || e.dni === "undefined" || e.dni === "NaN") continue;

      const [estud, estCreated] = await Estudiante.findOrCreate({
        where: { dni: e.dni },
        defaults: { dni: e.dni, nombre_apellido: e.nombre_apellido }
      });

      if (estCreated) resultados.estudiantes++;

      const comision = comisionMap[e.cod_comision];

      if (!comision) {
        resultados.errores.push(`Comisión no encontrada para estudiante ${e.dni}: ${e.cod_comision}`);
        continue;
      }

      const [, matCreated] = await Matricula.findOrCreate({
        where: {
          estudianteDni: estud.dni,
          comisionId: comision.comisionId
        },
        defaults: {
          estudianteDni: estud.dni,
          comisionId: comision.comisionId
        }
      });

      if (matCreated) resultados.matriculas++;
    }

    res.json({
      mensaje: "Importación completada con éxito",
      resultados
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};