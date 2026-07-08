// ============================================================
// routes/importar.js
// ============================================================
// Rutas para importación de datos desde Excel.
//
// Endpoints existentes (estudiantes, docentes, comisiones):
//   POST /api/importar/preview
//   POST /api/importar/confirmar
//
// Endpoint NUEVO (esta iteración):
//   POST /api/importar/aulas
// ============================================================

const express = require("express");
const router = express.Router();
const multer = require("multer");

const importarController = require("../controllers/importarController");
const importarAulasController = require("../controllers/importarAulasController");
const requireRole = require("../middleware/requireRole");
const asyncHandler = require("../middleware/asyncHandler");

// ── Configuración de multer ──
// memoryStorage: el archivo queda en memoria como Buffer (req.file.buffer).
// No lo guardamos en disco porque solo lo necesitamos durante el procesamiento.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Máximo 10 MB
  },
  fileFilter: (req, file, cb) => {
    // Solo aceptamos .xlsx
    const okExt = /\.xlsx$/i.test(file.originalname);
    if (okExt) return cb(null, true);
    cb(new Error("Solo se aceptan archivos .xlsx"));
  },
});

// ═════════════════════════════════════════════════════════════
// RUTAS EXISTENTES (estudiantes/docentes/comisiones)
// ═════════════════════════════════════════════════════════════

router.post(
  "/preview",
  upload.single("archivo"),
  importarController.preview
);

router.post(
  "/confirmar",
  upload.single("archivo"),
  importarController.confirmar
);

// ═════════════════════════════════════════════════════════════
// RUTA NUEVA: IMPORTAR AULAS
// ═════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/importar/aulas:
 *   post:
 *     summary: Importar aulas desde Excel
 *     description: |
 *       Procesa un archivo Excel con hoja "AULAS" y crea/actualiza aulas
 *       con sus atributos. Idempotente: subir el mismo archivo dos veces
 *       no duplica datos. Solo administradores.
 *     tags: [Importar]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - archivo
 *             properties:
 *               archivo:
 *                 type: string
 *                 format: binary
 *                 description: Archivo Excel (.xlsx) con hoja "AULAS"
 *     responses:
 *       200:
 *         description: Importación completada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 creadas: { type: integer }
 *                 actualizadas: { type: integer }
 *                 totalErrores: { type: integer }
 *                 errores:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       fila: { type: integer }
 *                       motivo: { type: string }
 *       400:
 *         description: Archivo faltante o hoja "AULAS" no encontrada
 */
router.post(
  "/aulas",
  requireRole("administrador"),
  upload.single("archivo"),
  asyncHandler(importarAulasController.importar.bind(importarAulasController))
);

module.exports = router;
