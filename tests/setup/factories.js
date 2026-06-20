const bcrypt = require("bcryptjs");
const {
  Usuario,
  Materia,
  Profesor,
  Comision,
  TipoEvento,
  Estudiante,
  Asistencia,
  Aula,
  Horario,
  Matricula,
  Edificio 
} = require("../../models");

const uniko = () => Math.floor(Math.random() * 1000000);
const SALT = 10;

// ─── NUEVA FACTORY PARA USUARIO ──────────────────────────────────────
async function crearUsuario(data = {}) {
  const idUnico = uniko();
  const dniFinal = data.dni || String(idUnico).padStart(8, "0");
  const rolFinal = data.rol || "alumno";
  let referenciaIdFinal = data.referenciaId;

  // Si no viene referenciaId, creamos la entidad correspondiente en DB para mantener la integridad
  if (!referenciaIdFinal) {
    if (rolFinal === "alumno") {
      const est = await crearEstudiante({ dni: dniFinal });
      referenciaIdFinal = est.dni;
    } else if (rolFinal === "docente") {
      const prof = await crearProfesor({ dni: dniFinal });
      referenciaIdFinal = prof.dni;
    } else {
      referenciaIdFinal = dniFinal; // Admin se referencia a sí mismo o null
    }
  }

  return Usuario.create({
    dni: dniFinal,
    nombre: data.nombre || `Usuario Test ${idUnico}`,
    password: data.password ? await bcrypt.hash(String(data.password), SALT) : await bcrypt.hash("password123", SALT),
    rol: rolFinal,
    referenciaId: referenciaIdFinal,
    activo: data.activo !== undefined ? data.activo : true,
    cambioPasswordObligatorio: data.cambioPasswordObligatorio !== undefined ? data.cambioPasswordObligatorio : false,
    ...data
  });
}

// ─── FACTORY PARA EDIFICIO ───────────────────────────────────────────
async function crearEdificio(data = {}) {
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
    dni: data.dni || String(idUnico).padStart(8, "0"), 
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
    dni: data.dni || String(idUnico).padStart(8, "0"),
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

async function crearAula(data = {}) {
  let edificioId = data.edificioId;
  
  if (!edificioId) {
    const edificio = await crearEdificio();
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
  crearUsuario,
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