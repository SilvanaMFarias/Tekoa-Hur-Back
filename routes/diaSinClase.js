const express = require('express');
const router = express.Router();

const diaSinClaseController = require('../controllers/diaSinClaseController');

/**
 * @swagger
 * tags:
 *   name: DiasSinClase
 *   description: Gestión de días sin clase por comisión o globales
 */


/**
 * @swagger
 * /api/diaSinClase:
 *   get:
 *     summary: Obtener todos los días sin clase
 *     tags: [DiasSinClase]
 *     responses:
 *       200:
 *         description: Lista de días sin clase
 */
router.get('/', diaSinClaseController.getAll);

/**
 * @swagger
 * /api/diaSinClase/{id}:
 *   get:
 *     summary: Obtener un día sin clase por ID
 *     tags: [DiasSinClase]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 */
router.get('/:id', diaSinClaseController.getById);

/**
 * @swagger
 * /api/diaSinClase:
 *   post:
 *     summary: Crear un nuevo día sin clase
 *     tags: [DiasSinClase]
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
 *               tipoEventoId:
 *                 type: string
 *                 format: uuid
 *               comisionId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Si es null afecta a todas las comisiones
 */
router.post('/', diaSinClaseController.create);

/**
 * @swagger
 * /api/diaSinClase/{id}:
 *   put:
 *     summary: Actualizar un día sin clase
 *     tags: [DiasSinClase]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 */
router.put('/:id', diaSinClaseController.update);

/**
 * @swagger
 * /api/diaSinClase/{id}:
 *   delete:
 *     summary: Eliminar un día sin clase
 *     tags: [DiasSinClase]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 */
router.delete('/:id', diaSinClaseController.delete);

module.exports = router;