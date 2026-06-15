// se crea un error personalizado para manejar errores de la app de forma consistente
// errors/AppError.js
class AppError extends Error {
  constructor(message, status = 500, code = null) {
    super(message);

    this.name = this.constructor.name;
    this.status = status;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }


  //se genera un error específico para cada tipo de error común, con su código HTTP correspondiente
  static badRequest(message, code = "BAD_REQUEST") {
    return new AppError(message, 400, code);
  }

  static unauthorized(message, code = "UNAUTHORIZED") {
    return new AppError(message, 401, code);
  }

  static forbidden(message, code = "FORBIDDEN") {
    return new AppError(message, 403, code);
  }

  static notFound(message, code = "NOT_FOUND") {
    return new AppError(message, 404, code);
  }

  static conflict(message, code = "CONFLICT") {
    return new AppError(message, 409, code);
  }
}

module.exports = AppError;