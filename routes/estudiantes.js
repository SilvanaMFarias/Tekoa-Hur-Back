const express = require('express');
const router = express.Router();
const Estudiante = require('../models/Estudiante'); // Ajusta la ruta según tu modelo

/**
 * @openapi
 * /estudiantes:
 *   get:
 *     summary: Obtiene todos los estudiantes
 *     description: Retorna una lista completa de estudiantes registrados en el sistema
 *     tags:
 *       - Estudiantes
 *     responses:
 *       200:
 *         description: Lista de estudiantes obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   nombre:
 *                     type: string
 *                   apellido:
 *                     type: string
 *                   email:
 *                     type: string
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', async (req, res) => {
    try {
        const estudiantes = await Estudiante.findAll();
        res.json(estudiantes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /estudiantes:
 *   post:
 *     summary: Crea un nuevo estudiante
 *     tags:
 *       - Estudiantes
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - apellido
 *               - email
 *             properties:
 *               nombre:
 *                 type: string
 *               apellido:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       201:
 *         description: Estudiante creado exitosamente
 *       400:
 *         description: Datos inválidos
 */
router.post('/', async (req, res) => {
    try {
        const nuevoEstudiante = await Estudiante.create(req.body);
        res.status(201).json(nuevoEstudiante);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;