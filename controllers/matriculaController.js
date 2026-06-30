// ============================================================
// controllers/matriculaController.js
// ============================================================
// Controller de Matrículas.
// "Thin controller, fat service": solo extrae datos del request,
// llama al service, y devuelve respuesta.
// ============================================================

const matriculaService = require('../services/matriculaService');

class MatriculaController {
  // GET /api/matriculas/por-estudiante/:dni
  async listarPorEstudiante(req, res, next) {
    try {
      const matriculas = await matriculaService.listarPorEstudiante(req.params.dni);
      res.json(matriculas);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/matriculas/comisiones-disponibles/:matriculaId
  async comisionesDisponiblesParaCambio(req, res, next) {
    try {
      const comisiones = await matriculaService.comisionesDisponiblesParaCambio(
        req.params.matriculaId
      );
      res.json(comisiones);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/matriculas/cambiar-comision
  // Body: { matriculaId, nuevaComisionId }
  async cambiarComision(req, res, next) {
    try {
      const { matriculaId, nuevaComisionId } = req.body;
      const matricula = await matriculaService.cambiarComision(
        matriculaId,
        nuevaComisionId
      );
      res.json({
        message: 'Comisión cambiada correctamente',
        matricula,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/matriculas/:matriculaId (soft delete)
  async darDeBaja(req, res, next) {
    try {
      const matricula = await matriculaService.darDeBaja(req.params.matriculaId);
      res.json({
        message: 'Matrícula dada de baja correctamente',
        matricula,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/matriculas
  // Body: { estudianteDni, comisionId }
  async inscribir(req, res, next) {
    try {
      const matricula = await matriculaService.inscribir({
        estudianteDni: req.body.estudianteDni,
        comisionId: req.body.comisionId,
      });
      res.status(201).json({
        message: 'Alumno inscripto correctamente',
        matricula,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/matriculas/materias-con-comisiones
  // Helper para poblar el dropdown de "Inscribir en nueva comisión".
  async materiasConComisiones(req, res, next) {
    try {
      const materias = await matriculaService.materiasConComisiones();
      res.json(materias);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MatriculaController();
