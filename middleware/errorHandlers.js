const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Error de Sequelize: duplicados
  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({
      error: "Registro duplicado",
    });
  }

  // Error de validación Sequelize
  if (err.name === "SequelizeValidationError") {
    return res.status(400).json({
      error: err.errors.map(e => e.message),
    });
  }

  // Respuesta general.
  // Si el error tiene `detalles` (objetos custom de AppError),
  // los incluimos en la respuesta. Es aditivo: errores que no
  // tienen `detalles` siguen funcionando igual que antes.
  res.status(err.status || 500).json({
    error: err.message || "Error interno del servidor",
    ...(err.code && { code: err.code }),
    ...(err.detalles && { detalles: err.detalles }),
  });
};

module.exports = errorHandler;
