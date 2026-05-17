/**
 * Controlador base reutilizable para operaciones CRUD.
 *
 * Recibe un service/model y opcionalmente configuraciones
 * por defecto de Sequelize (include, order, where, etc).
 *
 * Esto permite reutilizar lógica y evitar sobrescribir
 * métodos como getAll en cada controller específico.
 */

class BaseController {
  /**
   * @param {Object} service
   * Servicio/modelo que contiene métodos CRUD.
   *
   * @param {Object} defaultOptions
   * Opciones por defecto para consultas Sequelize.
   *
   * Ejemplos:
   * - include
   * - order
   * - where
   * - attributes
   */
  constructor(service, defaultOptions = {}) {
    this.service = service;

    /**NUEVO: Guarda configuraciones reutilizables para las consultas.
     * Esto permite que un controller pueda definir:
     *
     * super(Feriado, {
     *   include: [...],
     *   order: [...]
     * })
     * y automáticamente se aplicarán al getAll(). */
    this.defaultOptions = defaultOptions;
  }

  /** Obtener todos los registros */
  getAll = async (req, res, next) => {

    /** CAMBIO:
     * Antes:
     * this.service.getAll()
     *
     * Ahora:
     * this.service.getAll(this.defaultOptions)
     *
     * Esto permite pasar includes, order, where, etc. */
    const items = await this.service.getAll(this.defaultOptions);

    res.json(items);
  };

  /**Obtener un registro por ID*/
  getById = async (req, res, next) => {
    const item = await this.service.getById(req.params.id);

    if (!item) {
      return res.status(404).json({
        message: "Registro no encontrado"
      });
    }

    res.json(item);
  };

  /** Crear un registro */
  create = async (req, res, next) => {
    const item = await this.service.create(req.body);

    res.status(201).json(item);
  };

  /** Actualizar un registro */
  update = async (req, res, next) => {
    const updated = await this.service.update(
      req.params.id,
      req.body
    );

    if (!updated) {
      return res.status(404).json({
        message: "Registro no encontrado"
      });
    }

    res.json({
      message: "Registro actualizado"
    });
  };

  /** Eliminar un registro */
  delete = async (req, res, next) => {
    const deleted = await this.service.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        message: "Registro no encontrado"
      });
    }

    res.json({
      message: "Registro eliminado"
    });
  };
}

module.exports = BaseController;