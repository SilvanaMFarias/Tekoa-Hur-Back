const express = require('express');
const router = express.Router();
const tipoEventoController = require('../controllers/tipoEventoController');

/**
 * @swagger
 * tags:
 *   name: TipoEventos
 *   description: Tipos de eventos por los cuales no se registra asistencia.
 */

/**
 * @swagger
 * /api/tipo-eventos:
 *   get:
 *     summary: Obtener todos los eventos por los cuales no se registra asistencia.
 *     tags: [TipoEventos]
 *     responses:
 *       200:
 *         description: Lista de feriados
 */
router.get('/', tipoEventoController.getAll);

/**
 * @swagger
 * /api/tipo-eventos/{id}:
 *   get:
 *     summary: Obtener un eventos por ID
 *     tags: [TipoEventos]
 */
router.get('/:id', tipoEventoController.getById);

/**
 * @swagger
 * /api/tipo-eventos:
 *   post:
 *     summary: Crear un nuevo evento por el cual no se registra asistencia
 *     tags: [TipoEventos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 */
router.post('/', tipoEventoController.create);

/**
 * @swagger
 * /api/tipo-eventos/{id}:
 *   put:
 *     summary: Actualizar un tipo de evento
 *     tags: [TipoEventos]
 */
router.put('/:id', tipoEventoController.update);

/**
 * @swagger
 * /api/tipo-eventos/{id}:
 *   delete:
 *     summary: Eliminar un tipo de evento
 *     tags: [TipoEventos]
 */
router.delete('/:id', tipoEventoController.delete);

module.exports = router;