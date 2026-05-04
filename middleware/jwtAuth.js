const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "tekoa-hur-secret-cambiame";

/**
 * Middleware jwtAuth — verifica el token JWT en cada request protegido.
 *
 * Espera el header: Authorization: Bearer <token>
 *
 * Si el token es válido adjunta req.usuario con:
 *  { usuarioId, dni, nombre, rol }
 *
 * Si no hay token o es inválido → 401 Unauthorized.
 */
const jwtAuth = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Token no proporcionado. Iniciá sesión para continuar.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded; // { usuarioId, dni, nombre, rol, iat, exp }
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "La sesión expiró. Iniciá sesión nuevamente.",
      });
    }
    return res.status(401).json({
      message: "Token inválido.",
    });
  }
};

module.exports = jwtAuth;
