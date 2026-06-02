// ============================================================
// services/aulaAtributosService.js
// ============================================================
// Esta service maneja la lógica de los atributos descriptivos
// de cada aula (capacidad, equipamiento, lab informático, etc).
//
// La operación principal es guardar() que usa UPSERT de Sequelize.
//
// ¿Qué es un UPSERT?
//   En Postgres: INSERT ... ON CONFLICT DO UPDATE
//   - Si la fila no existe → la crea
//   - Si la fila ya existe → la actualiza
//   Todo en una sola operación atómica.
//
// ¿Por qué es importante usar upsert y no un "buscar y después
// crear o actualizar"?
//   Porque "buscar + crear" tiene una RACE CONDITION: entre que
//   buscamos (no existe) y creamos, otro proceso podría haber
//   creado uno. Ahí terminamos con error de duplicado.
//   Upsert es atómico: la DB resuelve el conflicto internamente.
// ============================================================

const { AulaAtributos, Aula } = require("../models");
const AppError = require("../errors/AppError");

class AulaAtributosService {
  /**
   * Obtiene los atributos de un aula.
   *
   * @param {string} aulaId - UUID del aula
   * @returns {Promise<Object|null>} - los atributos, o null si no se cargaron
   */
  async obtener(aulaId) {
    if (!aulaId) {
      throw AppError.badRequest("aulaId es requerido");
    }

    // Verificar que el aula exista
    const aula = await Aula.findByPk(aulaId);
    if (!aula) {
      throw AppError.notFound("Aula no encontrada");
    }

    // Buscar los atributos (pueden no existir)
    const atributos = await AulaAtributos.findByPk(aulaId);

    // Si no hay atributos cargados, devolvemos null (no es error)
    return atributos;
  }

  /**
   * Guarda los atributos de un aula (upsert).
   * Si el aula ya tiene atributos, los actualiza. Si no, los crea.
   *
   * @param {string} aulaId - UUID del aula
   * @param {Object} datos - { capacidad, tipoAula, esLaboratorioInformatico,
   *                           cantidadPC, descripcion, equipamiento }
   * @returns {Promise<Object>} - los atributos guardados
   */
  async guardar(aulaId, datos) {
    if (!aulaId) {
      throw AppError.badRequest("aulaId es requerido");
    }

    // Verificar que el aula exista antes de guardar
    const aula = await Aula.findByPk(aulaId);
    if (!aula) {
      throw AppError.notFound("Aula no encontrada");
    }

    // Validaciones de negocio
    if (datos.capacidad !== undefined && datos.capacidad !== null) {
      if (Number(datos.capacidad) < 0) {
        throw AppError.badRequest("La capacidad no puede ser negativa");
      }
    }

    if (datos.cantidadPC !== undefined && datos.cantidadPC !== null) {
      if (Number(datos.cantidadPC) < 0) {
        throw AppError.badRequest("La cantidad de PCs no puede ser negativa");
      }
    }

    // Normalización defensiva: si NO es laboratorio informático,
    // la cantidad de PCs debe ser null. Evita estados inconsistentes
    // como "aula común con 15 PCs" que sería un dato sin sentido.
    const esLab = Boolean(datos.esLaboratorioInformatico);
    const cantidadPC = esLab ? datos.cantidadPC ?? null : null;

    // Preparar payload limpio
    const payload = {
      aulaId,
      capacidad: datos.capacidad ?? null,
      tipoAula: datos.tipoAula ?? null,
      esLaboratorioInformatico: esLab,
      cantidadPC,
      descripcion: datos.descripcion ?? null,
      equipamiento: Array.isArray(datos.equipamiento) ? datos.equipamiento : [],
    };

    // UPSERT: si existe la fila con esta aulaId, la actualiza.
    // Si no, la crea. Atómico, sin race conditions.
    const [atributos] = await AulaAtributos.upsert(payload);

    return atributos;
  }

  /**
   * Elimina los atributos de un aula. El aula sigue existiendo.
   *
   * @param {string} aulaId - UUID del aula
   * @returns {Promise<Object>} - { ok: true, eliminado: boolean }
   */
  async eliminar(aulaId) {
    if (!aulaId) {
      throw AppError.badRequest("aulaId es requerido");
    }

    const aula = await Aula.findByPk(aulaId);
    if (!aula) {
      throw AppError.notFound("Aula no encontrada");
    }

    const eliminados = await AulaAtributos.destroy({
      where: { aulaId },
    });

    return {
      ok: true,
      eliminado: eliminados > 0,
    };
  }
}

module.exports = new AulaAtributosService();
