const jwt = require("jsonwebtoken");

// Ahora acepta un objeto de configuración opcional
function generarTokenAdmin(config = {}) {
  return jwt.sign(
    {
      // Si recibimos un usuarioId, lo usamos; si no, usamos un UUID de prueba válido
      usuarioId: config.usuarioId || "550e8400-e29b-41d4-a716-446655440000",
      dni: config.dni || "12345678",
      nombre: config.nombre || "Admin Test",
      rol: config.rol || "administrador"
    },
    process.env.JWT_SECRET || "tekoa-hur-secret-cambiame"
  );
}

module.exports = {
  generarTokenAdmin
};