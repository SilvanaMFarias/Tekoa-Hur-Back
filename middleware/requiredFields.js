/**
 * Middleware para validar campos requeridos en el body de la solicitud
 * @param {string[]} requiredFields - Array de nombres de campos requeridos
 * @returns {function} Middleware function
 */
const validateRequiredFields = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      const error = new Error(`Campos requeridos faltantes: ${missingFields.join(', ')}`);
      error.status = 400;
      return next(error);
    }

    next();
  };
};

module.exports = validateRequiredFields;