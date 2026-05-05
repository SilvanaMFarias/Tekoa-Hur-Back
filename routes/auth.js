const express     = require("express");
const router      = express.Router();
const jwtAuth     = require("../middleware/jwtAuth");
const requireRole = require("../middleware/requireRole");

const {
  login, me, cambiarPassword,
  listarUsuarios, crearUsuario, editarUsuario, desactivarUsuario, resetPassword,
  seedUsuarios, seedTodos,
} = require("../controllers/authController");

// ── Públicas ─────────────────────────────────────────────────
router.post("/login", login);

// ── Cualquier usuario autenticado ─────────────────────────────
router.get("/me",               jwtAuth, me);
router.put("/cambiar-password", jwtAuth, cambiarPassword);

// ── Solo administrador — gestión de usuarios ─────────────────
router.get(   "/usuarios",                    jwtAuth, requireRole("administrador"), listarUsuarios);
router.post(  "/usuarios",                    jwtAuth, requireRole("administrador"), crearUsuario);
router.put(   "/usuarios/:usuarioId",         jwtAuth, requireRole("administrador"), editarUsuario);
router.delete("/usuarios/:usuarioId",         jwtAuth, requireRole("administrador"), desactivarUsuario);
router.post(  "/usuarios/:usuarioId/reset",   jwtAuth, requireRole("administrador"), resetPassword);

// ── Seeds (solo desarrollo) ───────────────────────────────────
router.post("/seed",       seedUsuarios);
router.post("/seed-todos", seedTodos);

module.exports = router;
