const express = require("express");
const router = express.Router();
const estudianteController = require("../controllers/estudianteController");

/**
 * @swagger
 * tags:
 *   - name: Estudiantes
 *     description: Endpoints para gestión de estudiantes
 */

/**
 * @swagger
 * /api/estudiantes:
 *   get:
 *     summary: Obtener todos los estudiantes
 *     tags: [Estudiantes]
 *     responses:
 *       200:
 *         description: Lista de estudiantes
 */
router.get("/", estudianteController.getAll);

/**
 * @swagger
 * /api/estudiantes/{dni}:
 *   get:
 *     summary: Obtener un estudiante por DNI
 *     tags: [Estudiantes]
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/:dni", estudianteController.getById);

/**
 * @swagger
 * /api/estudiantes:
 *   post:
 *     summary: Crear un estudiante
 *     tags: [Estudiantes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dni:
 *                 type: string
 *               nombre_apellido:
 *                 type: string
 */
router.post("/", estudianteController.create);

/**
 * @swagger
 * /api/estudiantes/{dni}:
 *   put:
 *     summary: Actualizar un estudiante
 *     tags: [Estudiantes]
 */
router.put("/:dni", estudianteController.update);

/**
 * @swagger
 * /api/estudiantes/{dni}:
 *   delete:
 *     summary: Eliminar un estudiante
 *     tags: [Estudiantes]
 */
router.delete("/:dni", estudianteController.delete);

// Ruta extra con lógica específica
router.get("/nombre/:nombre", estudianteController.getByNombre);

module.exports = router;