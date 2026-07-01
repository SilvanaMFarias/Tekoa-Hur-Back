// ============================================================
// services/matriculaService.js
// ============================================================
// Service de Matrículas (inscripciones alumno-comisión).
//
// Reglas de negocio centrales:
//   1. Un alumno NO puede estar inscripto dos veces ACTIVO en la
//      misma materia (sí en distintas materias).
//   2. Cambiar de comisión SOLO es válido si la nueva comisión
//      pertenece a la MISMA materia que la actual.
//   3. La materia debe tener más de una comisión para poder cambiar
//      (sino no hay alternativa).
//   4. Las bajas son SOFT DELETE (estado = "baja"), nunca se borra
//      el registro de la BD.
// ============================================================

const { Op } = require('sequelize');
const {
  Matricula,
  Estudiante,
  Comision,
  Materia,
  Profesor,
} = require('../models');
const AppError = require('../errors/AppError');

class MatriculaService {
  // ============================================================
  // LISTAR matrículas activas de un alumno
  // ============================================================
  /**
   * Devuelve las matrículas ACTIVAS de un alumno, con su comisión,
   * materia y docente. Útil para el modal de gestión.
   */
  async listarPorEstudiante(estudianteDni) {
    if (!estudianteDni) {
      throw AppError.badRequest('estudianteDni es requerido');
    }

    const estudiante = await Estudiante.findByPk(estudianteDni);
    if (!estudiante) throw AppError.notFound('Estudiante no encontrado');

    return Matricula.findAll({
      where: { estudianteDni, estado: 'activa' },
      include: [
        {
          model: Comision,
          as: 'comision',
          include: [
            { model: Materia, as: 'materia' },
            { model: Profesor, as: 'profesor' },
          ],
        },
      ],
      order: [['fechaInscripcion', 'ASC']],
    });
  }

  // ============================================================
  // COMISIONES DISPONIBLES para cambiar
  // ============================================================
  /**
   * Devuelve las comisiones de la MISMA MATERIA que la actual,
   * excluyendo la propia. Si la materia solo tiene una comisión,
   * devuelve [].
   *
   * Esto es lo que el frontend usa para poblar el dropdown de
   * "Cambiar a comisión...".
   */
  async comisionesDisponiblesParaCambio(matriculaId) {
    if (!matriculaId) {
      throw AppError.badRequest('matriculaId es requerido');
    }

    const matricula = await Matricula.findByPk(matriculaId, {
      include: [{ model: Comision, as: 'comision' }],
    });
    if (!matricula) throw AppError.notFound('Matrícula no encontrada');
    if (matricula.estado === 'baja') {
      throw AppError.badRequest('La matrícula está dada de baja');
    }

    const materiaId = matricula.comision.materiaId;

    return Comision.findAll({
      where: {
        materiaId,
        comisionId: { [Op.ne]: matricula.comisionId }, // excluir la actual
      },
      include: [
        { model: Materia, as: 'materia' },
        { model: Profesor, as: 'profesor' },
      ],
      order: [['cod_comision', 'ASC']],
    });
  }

  // ============================================================
  // CAMBIAR de comisión MÉTODO CLAVE
  // ===========================================================
  /**
   * Cambia un alumno de una comisión a otra DE LA MISMA MATERIA.
   *
   * Implementación:
   *   1. Verifica que ambas comisiones existan.
   *   2. Verifica que sean de la MISMA MATERIA (regla principal).
   *   3. Verifica que la nueva comisión NO sea la actual.
   *   4. Da de baja la matrícula vieja (soft delete).
   *   5. Crea la matrícula nueva.
   *
   * Por qué dar de baja + crear (en vez de UPDATE):
   *   Para mantener histórico: queda registro de "estuvo en C-12 hasta
   *   tal fecha, después pasó a C-13". Con un UPDATE perdemos eso.
   */
  async cambiarComision(matriculaId, nuevaComisionId) {
    if (!matriculaId || !nuevaComisionId) {
      throw AppError.badRequest('matriculaId y nuevaComisionId son requeridos');
    }

    // 1. Traer la matrícula actual con su comisión
    const matriculaActual = await Matricula.findByPk(matriculaId, {
      include: [{ model: Comision, as: 'comision' }],
    });
    if (!matriculaActual) throw AppError.notFound('Matrícula no encontrada');
    if (matriculaActual.estado === 'baja') {
      throw AppError.badRequest('La matrícula está dada de baja');
    }

    // 2. La misma comisión: no hay nada que hacer
    if (matriculaActual.comisionId === nuevaComisionId) {
      throw AppError.badRequest('El alumno ya está en esa comisión');
    }

    // 3. Traer la nueva comisión y validar misma materia
    const nuevaComision = await Comision.findByPk(nuevaComisionId);
    if (!nuevaComision) throw AppError.notFound('Comisión destino no encontrada');

    if (nuevaComision.materiaId !== matriculaActual.comision.materiaId) {
      throw AppError.badRequest(
        'Solo se puede cambiar a una comisión de la MISMA materia'
      );
    }

    // 4. Dar de baja la matrícula vieja
    matriculaActual.estado = 'baja';
    matriculaActual.fechaBaja = new Date();
    await matriculaActual.save();

    // 5. Reactivar matrícula previa en la comisión destino, o crear nueva
    //    Misma lógica defensiva que en inscribir(): si el alumno ya estuvo
    //    en esa comisión y le dieron de baja, reactivamos en vez de crear
    //    una nueva fila (evita conflicto con UNIQUE constraint).
    const matriculaPreviaDestino = await Matricula.findOne({
      where: {
        estudianteDni: matriculaActual.estudianteDni,
        comisionId: nuevaComisionId,
        estado: 'baja',
      },
    });

    let nuevaMatricula;
    if (matriculaPreviaDestino) {
      matriculaPreviaDestino.estado = 'activa';
      matriculaPreviaDestino.fechaBaja = null;
      matriculaPreviaDestino.fechaInscripcion = new Date();
      await matriculaPreviaDestino.save();
      nuevaMatricula = matriculaPreviaDestino;
    } else {
      nuevaMatricula = await Matricula.create({
        estudianteDni: matriculaActual.estudianteDni,
        comisionId: nuevaComisionId,
        fechaInscripcion: new Date(),
        estado: 'activa',
      });
    }

    // Devolver la nueva con joins
    return Matricula.findByPk(nuevaMatricula.matriculaId, {
      include: [
        {
          model: Comision,
          as: 'comision',
          include: [
            { model: Materia, as: 'materia' },
            { model: Profesor, as: 'profesor' },
          ],
        },
      ],
    });
  }

  // ============================================================
  // DAR DE BAJA (soft delete)
  // ============================================================
  /**
   * Marca la matrícula como "baja" en vez de borrarla.
   */
  async darDeBaja(matriculaId) {
    const matricula = await Matricula.findByPk(matriculaId);
    if (!matricula) throw AppError.notFound('Matrícula no encontrada');
    if (matricula.estado === 'baja') {
      throw AppError.badRequest('La matrícula ya está dada de baja');
    }

    matricula.estado = 'baja';
    matricula.fechaBaja = new Date();
    await matricula.save();
    return matricula;
  }

  // ============================================================
  // INSCRIBIR a un alumno en una comisión
  // ============================================================
  /**
   * Crea una matrícula nueva (o reactiva una previa).
   *
   * Lógica:
   *   1. Verifica que alumno y comisión existan.
   *   2. Verifica que el alumno NO tenga otra matrícula ACTIVA en
   *      la misma materia (en cualquier comisión).
   *   3. Si existe una matrícula PREVIA (en baja) del alumno en
   *      esta misma comisión → la REACTIVA en vez de crear otra
   *      (evita el UNIQUE constraint de la BD y mantiene historial).
   *   4. Si no existe ninguna → crea una nueva.
   */
  async inscribir({ estudianteDni, comisionId }) {
    if (!estudianteDni || !comisionId) {
      throw AppError.badRequest('estudianteDni y comisionId son requeridos');
    }

    // Existen?
    const [estudiante, comision] = await Promise.all([
      Estudiante.findByPk(estudianteDni),
      Comision.findByPk(comisionId),
    ]);
    if (!estudiante) throw AppError.notFound('Estudiante no encontrado');
    if (!comision) throw AppError.notFound('Comisión no encontrada');

    // ¿Ya está ACTIVO en esa comisión?
    const yaInscriptoActivo = await Matricula.findOne({
      where: { estudianteDni, comisionId, estado: 'activa' },
    });
    if (yaInscriptoActivo) {
      throw AppError.badRequest('El alumno ya está inscripto en esa comisión');
    }

    // ¿Ya tiene matrícula ACTIVA en otra comisión de la MISMA materia?
    const comisionesDeMateria = await Comision.findAll({
      where: { materiaId: comision.materiaId },
      attributes: ['comisionId'],
    });
    const idsComisionesDeMateria = comisionesDeMateria.map((c) => c.comisionId);

    const yaEnMateria = await Matricula.findOne({
      where: {
        estudianteDni,
        comisionId: { [Op.in]: idsComisionesDeMateria },
        estado: 'activa',
      },
    });
    if (yaEnMateria) {
      throw AppError.badRequest(
        'El alumno ya tiene una matrícula activa en otra comisión de esta materia. Cambiá de comisión en vez de inscribir.'
      );
    }

    // ⭐ ¿Existe una matrícula PREVIA dada de baja en ESTA misma comisión?
    // Si la hay, la REACTIVAMOS (evita conflicto con UNIQUE constraint y
    // mantiene un único registro histórico por alumno+comisión).
    const matriculaPrevia = await Matricula.findOne({
      where: { estudianteDni, comisionId, estado: 'baja' },
    });

    let matricula;
    if (matriculaPrevia) {
      // Reactivar
      matriculaPrevia.estado = 'activa';
      matriculaPrevia.fechaBaja = null;
      matriculaPrevia.fechaInscripcion = new Date();
      await matriculaPrevia.save();
      matricula = matriculaPrevia;
    } else {
      // Crear nueva
      matricula = await Matricula.create({
        estudianteDni,
        comisionId,
        fechaInscripcion: new Date(),
        estado: 'activa',
      });
    }

    return Matricula.findByPk(matricula.matriculaId, {
      include: [
        {
          model: Comision,
          as: 'comision',
          include: [
            { model: Materia, as: 'materia' },
            { model: Profesor, as: 'profesor' },
          ],
        },
      ],
    });
  }

  // ============================================================
  // LISTAR todas las materias con sus comisiones (para inscribir)
  // ============================================================
  /**
   * Devuelve todas las materias con sus comisiones, útil para el
   * dropdown de "Inscribir en nueva comisión" del modal.
   */
  async materiasConComisiones() {
    return Materia.findAll({
      include: [
        {
          model: Comision,
          as: 'comisiones',
          include: [{ model: Profesor, as: 'profesor' }],
        },
      ],
      order: [['nombre', 'ASC']],
    });
  }
}

module.exports = new MatriculaService();