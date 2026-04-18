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

  res.status(err.status || 500).json({
    error: err.message || "Error interno del servidor",
  });
};

module.exports = errorHandler;