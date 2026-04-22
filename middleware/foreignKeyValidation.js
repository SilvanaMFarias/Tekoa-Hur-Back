const { Op } = require('sequelize');

/**
 * Middleware para validar existencia de claves foráneas
 * @param {Model} model - Modelo Sequelize a validar
 * @param {string} field - Nombre del campo en req.body que contiene el ID
 * @param {string} [primaryKey='id'] - Nombre de la clave primaria en el modelo
 * @returns {function} Middleware function
 */
const validateForeignKey = (model, field, primaryKey = 'id') => {
  return async (req, res, next) => {
    try {
      const value = req.body[field];
      if (!value) {
        // Si el campo no está presente, asumir que se valida en otro lugar
        return next();
      }

      const exists = await model.findOne({
        where: { [primaryKey]: value }
      });

      if (!exists) {
        const error = new Error(`El valor '${value}' no existe en ${model.name} para el campo ${field}`);
        error.status = 400;
        return next(error);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = validateForeignKey;