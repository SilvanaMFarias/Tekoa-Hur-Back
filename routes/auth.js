// ============================================================
// routes/auth.js
// ============================================================

const express     = require("express");
const router      = express.Router();
const jwtAuth     = require("../middleware/jwtAuth");
const requireRole = require("../middleware/requireRole");
const { validateData, validators } = require("../middleware/dataValidation");

const {
  login, me, cambiarPassword,
  listarUsuarios, crearUsuario, editarUsuario, desactivarUsuario, resetPassword,
  seedUsuarios, seedTodos,
} = require("../controllers/authController");

/**
 * Recuperación de contraseña
 */
const {
  forgotPassword,
  //Ya existe resetPassword en authController, pero es para que el admin resetee al DNI del usuario.
  // Este es para que el usuario resetee su propia contraseña.
  resetPassword: resetPasswordRecovery,
  // Verifica si un token de reset sigue siendo válido SIN consumirlo.
  // Lo usa la pantalla de /reset-password al cargar, para mostrar
  // un cartel claro si el link expiró o es inválido.
  validateResetToken,
} = require("../controllers/passwordRecoveryController");

/**
 * Middleware validación reset password
 */
const validateResetPassword = require(
  "../middleware/validateResetPassword"
);

// ── Validaciones reutilizables ───────────────────────────────

// Valida que el DNI tenga formato argentino (7-8 dígitos)
const validarDni = validateData({
  dni: validators.dni,
});

// Valida formato de campos al crear/editar usuario
const validarUsuario = validateData({
  dni:    validators.dni,
  nombre: validators.string,
});

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Autenticación y gestión de usuarios
 */

// ── POST /api/auth/login ─────────────────────────────────────
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     description: Autentica un usuario con DNI y contraseña. Devuelve un token JWT.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dni, password]
 *             properties:
 *               dni:
 *                 type: string
 *                 example: "35123456"
 *                 description: DNI argentino (7-8 dígitos)
 *               password:
 *                 type: string
 *                 example: "mi_contraseña"
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 usuario:
 *                   type: object
 *                   properties:
 *                     usuarioId: { type: string }
 *                     dni:       { type: string }
 *                     nombre:    { type: string }
 *                     rol:       { type: string, enum: [alumno, docente, administrador] }
 *       400:
 *         description: Campos requeridos faltantes o formato inválido
 *       401:
 *         description: DNI o contraseña incorrectos
 */
router.post("/login", validarDni, login);

// ── GET /api/auth/me ─────────────────────────────────────────
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Datos del usuario logueado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario autenticado
 *       401:
 *         description: Token no válido o expirado
 */
router.get("/me", jwtAuth, me);

// ── PUT /api/auth/cambiar-password ───────────────────────────
/**
 * @swagger
 * /api/auth/cambiar-password:
 *   put:
 *     summary: Cambiar contraseña propia
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [passwordActual, passwordNueva]
 *             properties:
 *               passwordActual: { type: string }
 *               passwordNueva:  { type: string, minLength: 6 }
 *     responses:
 *       200: 
 *          description: Contraseña actualizada
 *       401: 
 *          description: Contraseña actual incorrecta
 */
router.put("/cambiar-password", jwtAuth, cambiarPassword);


// ── Recuperación de contraseña ───────────────────────────────
/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Solicitar recuperación de contraseña
 *     description: Genera un token temporal y envía instrucciones al email del usuario.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: "usuario@mail.com"
 *     responses:
 *       200:
 *         description: Si el email existe, se enviaron instrucciones.
 *       400:
 *         description: Email requerido.
 */
router.post("/forgot-password", forgotPassword);

/**
 * @swagger
 * /api/auth/validate-reset-token:
 *   post:
 *     summary: Verificar si un token de recuperación es válido (sin consumirlo)
 *     description: |
 *       Usado por la pantalla de restablecimiento al cargar.
 *       Permite mostrar un cartel claro cuando el link está vencido
 *       o es inválido, antes de que el usuario escriba la nueva clave.
 *       NO revela si el email existe en el sistema.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, token]
 *             properties:
 *               email: { type: string, example: "usuario@mail.com" }
 *               token: { type: string, example: "abc123token" }
 *     responses:
 *       200: 
 *          description: "Token válido. Devuelve { valid: true, nombre }"
 *       400: 
 *          description: "Token inválido o expirado. Devuelve { valid: false, message }"
 */
router.post("/validate-reset-token", validateResetToken);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Restablecer contraseña mediante token
 *     description: |
 *       Permite establecer una nueva contraseña usando el token recibido por email.
 *       Política de la nueva clave: mínimo 8 caracteres, al menos una mayúscula
 *       y al menos un carácter especial. El middleware validateResetPassword
 *       devuelve un array `errors[]` con todos los requisitos incumplidos.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *          application/json:
 *           schema:
 *             type: object
 *             required: [email, token, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: "usuario@mail.com"
 *               token:
 *                 type: string
 *                 example: "abc123token"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: "NuevaPassword!23"
 *     responses:
 *       200:
 *         description: Contraseña actualizada correctamente.
 *       400:
 *         description: Token inválido o expirado, o contraseña no cumple política.
 */
router.post("/reset-password", validateResetPassword, resetPasswordRecovery);

// ── Gestión de usuarios (solo administrador) ─────────────────

/**
 * @swagger
 * /api/auth/usuarios:
 *   get:
 *     summary: Listar todos los usuarios
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios
 */
router.get("/usuarios", jwtAuth, requireRole("administrador"), listarUsuarios);

/**
 * @swagger
 * /api/auth/usuarios:
 *   post:
 *     summary: Crear nuevo usuario
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dni, nombre, password, rol]
 *             properties:
 *               dni:      { type: string, example: "35123456" }
 *               nombre:   { type: string, example: "Juan Pérez" }
 *               password: { type: string, minLength: 6 }
 *               rol:      { type: string, enum: [alumno, docente, administrador] }
 *     responses:
 *       201: 
 *          description: Usuario creado
 *       409: 
 *          description: DNI ya existe
 */
router.post("/usuarios", jwtAuth, requireRole("administrador"), validarUsuario, crearUsuario);

/**
 * @swagger
 * /api/auth/usuarios/{usuarioId}:
 *   put:
 *     summary: Editar usuario
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: usuarioId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: 
 *          description: Usuario actualizado
 *       404: 
 *          description: Usuario no encontrado
 */
router.put("/usuarios/:usuarioId", jwtAuth, requireRole("administrador"), editarUsuario);

/**
 * @swagger
 * /api/auth/usuarios/{usuarioId}:
 *   delete:
 *     summary: Desactivar usuario (soft delete)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: usuarioId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: 
 *          description: Usuario desactivado
 *       403: 
 *          description: No se puede desactivar el admin principal
 */
router.delete("/usuarios/:usuarioId", jwtAuth, requireRole("administrador"), desactivarUsuario);

/**
 * @swagger
 * /api/auth/usuarios/{usuarioId}/reset:
 *   post:
 *     summary: Resetear contraseña al DNI del usuario
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: usuarioId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: 
 *          description: Contraseña reseteada al DNI
 */
router.post("/usuarios/:usuarioId/reset", jwtAuth, requireRole("administrador"), resetPassword);

// ── Seeds (solo desarrollo) ───────────────────────────────────
router.post("/seed",       seedUsuarios);
router.post("/seed-todos", seedTodos);

module.exports = router;