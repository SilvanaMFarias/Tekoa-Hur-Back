const express = require("express");
const router  = express.Router();
const jwtAuth = require("../middleware/jwtAuth");
const { login, me, seedUsuarios } = require("../controllers/authController");

/**
 * POST /api/auth/login
 * Autenticación con DNI y contraseña.
 * Devuelve JWT + datos del usuario.
 * No requiere jwtAuth (es el endpoint de entrada).
 */
router.post("/login", login);

/**
 * GET /api/auth/me
 * Devuelve los datos del usuario logueado.
 * Requiere token válido.
 */
router.get("/me", jwtAuth, me);

/**
 * POST /api/auth/seed
 * Crea usuarios de prueba.
 * ⚠️ SOLO PARA DESARROLLO — eliminar o proteger en producción.
 */
router.post("/seed", seedUsuarios);

module.exports = router;
