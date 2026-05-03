/*
============================================================
🔐 Middleware de autorización por rol
============================================================

Uso:
- Verifica que el usuario tenga un rol permitido
- Debe usarse DESPUÉS del middleware auth

Ejemplo:
requireRole("admin")
requireRole("profesor", "admin")
============================================================
*/

const requireRole = (...rolesPermitidos) => {
  return (req, res, next) => {
    // Si no hay usuario autenticado
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }

    // Si el rol no está permitido
    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ message: "No autorizado" });
    }

    next();
  };
};

module.exports = requireRole;