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
  Edificio,
  HistorialImportacion 
} = require("../../models");

const uniko = () => Math.floor(Math.random() * 1000000);
const SALT = 10;

// 🛠️ FACTORY PARA USUARIO (Original - Intacta)
async function crearUsuario(data = {}) {
  const idUnico = uniko();
  const dniFinal = data.dni || String(idUnico).padStart(8, "0");
  const rolFinal = data.rol || "alumno";
  let referenciaIdFinal = data.referenciaId;

  // Si no viene referenciaId, se crea la entidad correspondiente en DB para mantener la integridad
  if (!referenciaIdFinal) {
    if (rolFinal === "alumno") {
      const est = await crearEstudiante({ dni: dniFinal });
      referenciaIdFinal = est.dni;
    } else if (rolFinal === "docente") {
      const prof = await crearProfesor({ dni: dniFinal });
      referenciaIdFinal = prof.dni;
    } else {
      referenciaIdFinal = dniFinal; // Admin se referencia a sí mismo
    }
  }

  // Si es administrador, aseguramos defensivamente un email si no lo enviaron
  let emailFinal = data.email;
  if (rolFinal === "administrador" && !emailFinal) {
    emailFinal = `admin-${idUnico}@test.com`;
  }

  // Resolvemos la password antes para que no se pise con el ...data plano
  const passwordPlana = data.password || "password123";
  const passwordHasheada = await bcrypt.hash(String(passwordPlana), SALT);

  return Usuario.create({
    nombre: `Usuario Test ${idUnico}`,
    email: emailFinal,
    activo: true,
    cambioPasswordObligatorio: false,
    ...data, 
    dni: dniFinal,// evitamos que el dni se sobreescriba 
    rol: rolFinal,
    referenciaId: referenciaIdFinal,
    password: passwordHasheada // El hash encriptado simpre
  });
}

// 🌟 Variante que asegura un email único dinámico para CUALQUIER rol
async function crearUsuarioConEmail(data = {}) {
  const idUnico = uniko();
  const emailPorDefecto = `test-${idUnico}@correo.com`;

  // Invoca la lógica relacional de la factory base inyectando el email seguro
  return crearUsuario({
    email: data.email || emailPorDefecto,
    ...data
  });
}

// 🏢 FACTORY PARA EDIFICIO 
async function crearEdificio(data = {}) {
  return Edificio.create({
    nombre: `Edificio Central ${uniko()}`,
    ...data
  });
}

// 📚 FACTORY PARA MATERIA 
async function crearMateria(data = {}) {
  return Materia.create({
    nombre: `Programación ${uniko()}`,
    ...data
  });
}

// 👨‍🏫 FACTORY PARA PROFESOR 
async function crearProfesor(data = {}) {
  const idUnico = uniko();
  return Profesor.create({
    dni: data.dni || String(idUnico).padStart(8, "0"), 
    nombre_apellido: `Profesor Test ${idUnico}`,
    email: `profesor_${idUnico}@test.com`,
    ...data
  });
}

// 👥 FACTORY PARA COMISIÓN 
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

// 🏷️ FACTORY PARA TIPO DE EVENTO
async function crearTipoEvento(data = {}) {
  return TipoEvento.create({
    nombre: `Día institucional ${uniko()}`,
    ...data
  });
}

// 🎓 FACTORY PARA ESTUDIANTE
async function crearEstudiante(data = {}) {
  const idUnico = uniko();
  return Estudiante.create({
    dni: data.dni || String(idUnico).padStart(8, "0"),
    nombre_apellido: `Estudiante Test ${idUnico}`,
    ...data
  });
}

// 📝 FACTORY PARA ASISTENCIA
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

// 🏫 FACTORY PARA AULA
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

// ⏰ FACTORY PARA HORARIO
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

// 📇 FACTORY PARA MATRÍCULA
async function crearMatricula(data = {}) {
  const estudiante = data.estudianteDni ? null : await crearEstudiante();
  const comision = data.comisionId ? null : await crearComision();

  return Matricula.create({
    estudianteDni: data.estudianteDni || estudiante.dni,
    comisionId: data.comisionId || comision.comisionId,
    ...data
  });
}

async function crearHistorial(data = {}) {
  // Aseguramos que usuarioId no sea undefined
  if (!data.usuarioId) {
    throw new Error("crearHistorial requiere un usuarioId para mantener la integridad referencial");
  }

  return HistorialImportacion.create({
    origen: data.origen || "GENERAL",
    nombreArchivo: data.nombreArchivo || "archivo_test.xlsx",
    archivo: data.archivo || Buffer.from("test"),
    usuarioId: data.usuarioId, // <--- Este es el valor clave
    fechaEjecucion: data.fechaEjecucion || new Date(),
    tipoOperacion: data.tipoOperacion || 'CARGA_INICIAL',
    estado: data.estado || 'EXITOSA',
    cantidadErrores: data.cantidadErrores ?? 0,
    ...data
  });
}

module.exports = {
  crearUsuario,
  crearUsuarioConEmail, 
  crearEdificio,
  crearMateria,
  crearProfesor,
  crearComision,
  crearTipoEvento,
  crearEstudiante,
  crearAsistencia,
  crearAula,
  crearHorario,
  crearMatricula,
  crearHistorial
};