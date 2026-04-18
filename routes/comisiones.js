const express = require("express");
const router = express.Router();
const comisionController = require("../controllers/comisionController");

/**
 * @swagger
 * tags:
 *   - name: Comisiones
 *     description: Endpoints para gestión de comisiones
 */

/**
 * @swagger
 * /api/comisiones:
 *   get:
 *     summary: Obtener todas las comisiones
 *     tags: [Comisiones]
 *     responses:
 *       200:
 *         description: Lista de comisiones
 */
router.get("/", comisionController.getAll);

/**
 * @swagger
 * /api/comisiones/{id}:
 *   get:
 *     summary: Obtener una comisión por ID
 *     tags: [Comisiones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/:id", comisionController.getById);

/**
 * @swagger
 * /api/comisiones:
 *   post:
 *     summary: Crear una comisión
 *     tags: [Comisiones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cod_comision:
 *                 type: string
 *               materiaId:
 *                 type: string
 *               profesorId:
 *                 type: string
 */
router.post("/", comisionController.create);

/**
 * @swagger
 * /api/comisiones/{id}:
 *   put:
 *     summary: Actualizar una comisión
 *     tags: [Comisiones]
 */
router.put("/:id", comisionController.update);

/**
 * @swagger
 * /api/comisiones/{id}:
 *   delete:
 *     summary: Eliminar una comisión
 *     tags: [Comisiones]
 */
router.delete("/:id", comisionController.delete);

module.exports = router;