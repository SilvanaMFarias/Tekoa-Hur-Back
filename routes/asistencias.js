// ============================================================
// routes/asistencias.js
// ============================================================
// FIX crítico: el GET "/" ahora acepta ?comisionId= para filtrar.
// Sin esto la grilla del front no puede cargar datos por comisión —
// traería TODAS las asistencias del sistema de golpe.
// ============================================================

const express = require("express");
const router  = express.Router();
const asistenciaController = require("../controllers/asistenciaController");
const asyncHandler         = require("../middleware/asyncHandler");
const validateRequiredFields = require("../middleware/requiredFields");
const validateAsistencia   = require("../middleware/validateAsistencia");

/**
 * GET /api/asistencias
 * Acepta query param opcional: ?comisionId=UUID
 * Sin filtro devuelve todas (solo para admins / Swagger).
 */
router.get("/", asyncHandler(asistenciaController.getAll));

router.get("/:id", asyncHandler(asistenciaController.getById));

router.post(
  "/",
  validateRequiredFields(["fecha","horaRegistro","tipoUsuario","usuarioId","estado","comisionId","aulaId"]),
  validateAsistencia,
  asistenciaController.create
);

router.put("/:id", validateAsistencia, asistenciaController.update);

router.delete("/:id", asyncHandler(asistenciaController.delete));

// Endpoint principal que llama el front al escanear el QR
router.post("/registrar-desde-qr", asyncHandler(asistenciaController.registrarDesdeQR));

module.exports = router;
