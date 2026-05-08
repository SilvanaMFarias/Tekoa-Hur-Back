/**
 * requireRole — Middleware de autorización por rol.
 *
 * Uso:
 *   router.post("/importar", jwtAuth, requireRole("administrador"), handler)
 *   router.get("/asistencias", jwtAuth, requireRole("docente", "administrador"), handler)
 *
 * IMPORTANTE: siempre usar DESPUÉS de jwtAuth (necesita req.usuario).
 *
 * @param {...string} roles - Roles permitidos para acceder a la ruta
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ message: "No autenticado." });
    }

    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({
        message: `Acceso denegado. Se requiere uno de los roles: ${roles.join(", ")}.`,
      });
    }

    next();
  };
};

module.exports = requireRole;
