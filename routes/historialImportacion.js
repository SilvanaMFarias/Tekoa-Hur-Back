const express = require("express");
const router = express.Router();

const historialImportacionController =
    require("../controllers/historialImportacionController");

/**
 * @swagger
 * /api/historial-importaciones:
 *   get:
 *     summary: Obtener historial de importaciones
 *     description: Devuelve el historial de importaciones realizadas en el sistema.
 *     tags:
 *       - Historial de Importaciones
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Historial obtenido correctamente.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: Acceso denegado.
 *       500:
 *         description: Error interno del servidor.
 */
router.get(
    "/",
    historialImportacionController.listar
);

module.exports = router;