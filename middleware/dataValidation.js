/**
 * Middleware para validar formatos de datos
 * @param {Object} validations - Objeto con campos y funciones de validación
 * @returns {function} Middleware function
 */
const validateData = (validations) => {
  return (req, res, next) => {
    const errors = [];

    for (const [field, validator] of Object.entries(validations)) {
      const value = req.body[field];
      if (value !== undefined && !validator(value)) {
        errors.push(`Formato inválido para el campo ${field}`);
      }
    }

    if (errors.length > 0) {
      const error = new Error(`Errores de validación: ${errors.join(', ')}`);
      error.status = 400;
      return next(error);
    }

    next();
  };
};

// Validadores comunes
const validators = {
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  date: (value) => !isNaN(Date.parse(value)),
  dni: (value) => /^\d{7,8}$/.test(value), //DNI argentino
  positiveNumber: (value) => typeof value === 'number' && value > 0,
  string: (value) => typeof value === 'string' && value.trim().length > 0
};

module.exports = { validateData, validators };