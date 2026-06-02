const express = require("express");

const guaraniController = require("../controllers/guaraniController");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Guarani
 *   description: Integraciones con la API de Guarani
 */

/**
 * @swagger
 * /api/guarani/periodos-tekoa:
 *   get:
 *     summary: Obtener periodos lectivos desde Guarani
 *     tags: [Guarani]
 *     responses:
 *       200:
 *         description: JSON de periodos Lectivos devuelto por Guarani
 */
router.get(
    "/periodos-tekoa",
    asyncHandler(guaraniController.getPeriodosTekoa)
);

module.exports = router;