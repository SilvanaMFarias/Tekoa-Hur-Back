// se crea un error personalizado para manejar errores de la app de forma consistente
class AppError extends Error {
  constructor(message, status = 500) {
    super(message);

    this.name = this.constructor.name;
    this.status = status;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;