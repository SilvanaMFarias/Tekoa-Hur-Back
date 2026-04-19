const express = require('express');
const router = express.Router();
const feriadoController = require('../controllers/feriadoController');

/**
 * @swagger
 * tags:
 *   name: Feriados
 *   description: Gestión de dias no laborables (feriados)
 */


/**
 * @swagger
 * /api/feriados:
 *   get:
 *     summary: Obtener todos los feriados
 *     tags: [Feriados]
 *     responses:
 *       200:
 *         description: Lista de feriados
 */
router.get('/', feriadoController.getAll);

/**
 * @swagger
 * /api/feriados/{id}:
 *   get:
 *     summary: Obtener un feriado por ID
 *     tags: [Feriados]
 */
router.get('/:id', feriadoController.getById);

/**
 * @swagger
 * /api/feriados:
 *   post:
 *     summary: Crear una nueva fecha para dias no laborables
 *     tags: [Feriados]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fecha:
 *                 type: string
 *                 format: date
 *               descripcion:
 *                 type: string
 */
router.post('/', feriadoController.create);

/**
 * @swagger
 * /api/feriados/{id}:
 *   put:
 *     summary: Actualizar un feriado
 *     tags: [Feriados]
 */
router.put('/:id', feriadoController.update);

/**
 * @swagger
 * /api/feriados/{id}:
 *   delete:
 *     summary: Eliminar un feriado
 *     tags: [Feriados]
 */
router.delete('/:id', feriadoController.delete);

module.exports = router;