// routes/horarios.js
const express = require("express");
const router = express.Router();
const horarioController = require("../controllers/horarioController");

/**
 * @swagger
 * tags:
 *   - name: Horarios
 *     description: Endpoints para gestión de horarios
 */

/**
 * @swagger
 * /api/horarios:
 *   get:
 *     summary: Obtener todos los horarios
 *     tags: [Horarios]
 *     responses:
 *       200:
 *         description: Lista de horarios
 */
router.get("/", horarioController.getAll);

/**
 * @swagger
 * /api/horarios/{id}:
 *   get:
 *     summary: Obtener un horario por ID
 *     tags: [Horarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/:id", horarioController.getById);

/**
 * @swagger
 * /api/horarios:
 *   post:
 *     summary: Crear un horario
 *     tags: [Horarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               diaSemana:
 *                 type: string
 *               horaDesde:
 *                 type: string
 *                 format: time
 *               horaHasta:
 *                 type: string
 *                 format: time
 *               periodicidad:
 *                 type: string
 *               comisionId:
 *                 type: string
 *               aulaId:
 *                 type: string
 */
router.post("/", horarioController.create);

/**
 * @swagger
 * /api/horarios/{id}:
 *   put:
 *     summary: Actualizar un horario
 *     tags: [Horarios]
 */
router.put("/:id", horarioController.update);

/**
 * @swagger
 * /api/horarios/{id}:
 *   delete:
 *     summary: Eliminar un horario
 *     tags: [Horarios]
 */
router.delete("/:id", horarioController.delete);

module.exports = router;