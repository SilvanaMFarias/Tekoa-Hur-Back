const jwt = require("jsonwebtoken");

function generarTokenAdmin() {
  return jwt.sign(
    {
      usuarioId: "test-user",
      dni: "12345678",
      nombre: "Admin Test",
      rol: "administrador"
    },
    process.env.JWT_SECRET || "tekoa-hur-secret-cambiame"
  );
}

module.exports = {
  generarTokenAdmin
};