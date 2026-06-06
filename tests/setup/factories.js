const {
  Materia,
  Profesor,
  Comision,
  TipoEvento,
  Estudiante,
  Asistencia,
  Aula,
  Horario,
  Matricula,
  Edificio // <-- Nos aseguramos de importar Edificio
} = require("../../models");

const uniko = () => Math.floor(Math.random() * 1000000);

// ─── NUEVA FACTORY PARA EDIFICIO ─────────────────────────────────────
async function crearEdificio(data = {}) {
  // Ajustá los campos si tu modelo Edificio pide cosas distintas (ej: nombre)
  return Edificio.create({
    nombre: `Edificio Central ${uniko()}`,
    ...data
  });
}

async function crearMateria(data = {}) {
  return Materia.create({
    nombre: `Programación ${uniko()}`,
    ...data
  });
}

async function crearProfesor(data = {}) {
  const idUnico = uniko();
  return Profesor.create({
    dni: String(idUnico).padStart(8, "0"), 
    nombre_apellido: `Profesor Test ${idUnico}`,
    email: `profesor_${idUnico}@test.com`,
    ...data
  });
}

async function crearComision(data = {}) {
  const { materia, profesor, ...restoData } = data;
  const materiaInstancia = materia || await crearMateria();
  const profesorInstancia = profesor || await crearProfesor();

  return Comision.create({
    cod_comision: `COM-${uniko()}`,
    materiaId: materiaInstancia.materiaId,
    profesorId: profesorInstancia.profesorId,
    ...restoData
  });
}

async function crearTipoEvento(data = {}) {
  return TipoEvento.create({
    nombre: `Día institucional ${uniko()}`,
    ...data
  });
}

async function crearEstudiante(data = {}) {
  const idUnico = uniko();
  return Estudiante.create({
    dni: String(idUnico).padStart(8, "0"),
    nombre_apellido: `Estudiante Test ${idUnico}`,
    ...data
  });
}

async function crearAsistencia(data = {}) {
  const comision = data.comisionId ? null : await crearComision();
  const estudiante = data.usuarioId ? null : await crearEstudiante();

  return Asistencia.create({
    fecha: "2026-06-01",
    horaRegistro: "19:30:00",
    tipoUsuario: "ESTUDIANTE",
    usuarioId: data.usuarioId || estudiante.dni,
    estado: "PRESENTE",
    comisionId: data.comisionId || comision.comisionId,
    ...data
  });
}

// ─── DETALLE CLAVE: Ahora el Aula crea y se ata a un Edificio real ────
async function crearAula(data = {}) {
  let edificioId = data.edificioId;
  
  if (!edificioId) {
    const edificio = await crearEdificio();
    // Validamos si usa edificioId o id según cómo esté configurado tu modelo
    edificioId = edificio.edificioId || edificio.id;
  }

  return Aula.create({
    sector: "Sector A",
    numero: String(uniko()),
    edificioId: edificioId, 
    rtoken: `token-${uniko()}`,
    rtokenExpira: new Date(Date.now() + 60 * 60 * 1000),
    ...data
  });
}

async function crearHorario(data = {}) {
  const comision = data.comisionId ? null : await crearComision();
  const aula = data.aulaId ? null : await crearAula();

  return Horario.create({
    diaSemana: "lunes",
    horaDesde: "18:00",
    horaHasta: "22:00",
    comisionId: data.comisionId || comision.comisionId,
    aulaId: data.aulaId || aula.aulaId,
    periodicidad: "Todas",
    ...data
  });
}

async function crearMatricula(data = {}) {
  const estudiante = data.estudianteDni ? null : await crearEstudiante();
  const comision = data.comisionId ? null : await crearComision();

  return Matricula.create({
    estudianteDni: data.estudianteDni || estudiante.dni,
    comisionId: data.comisionId || comision.comisionId,
    ...data
  });
}

module.exports = {
  crearEdificio,
  crearMateria,
  crearProfesor,
  crearComision,
  crearTipoEvento,
  crearEstudiante,
  crearAsistencia,
  crearAula,
  crearHorario,
  crearMatricula
};