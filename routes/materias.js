const express = require("express");
const router = express.Router();
const materiaController = require("../controllers/materiaController");

/**
 * @swagger
 * tags:
 *   - name: Materias
 *     description: Endpoints para gestión de materias
 */

/**
 * @swagger
 * /api/materias:
 *   get:
 *     summary: Obtener todas las materias
 *     tags: [Materias]
 *     responses:
 *       200:
 *         description: Lista de materias
 */
router.get("/", materiaController.getAll);

/**
 * @swagger
 * /api/materias/{id}:
 *   get:
 *     summary: Obtener una materia por ID
 *     tags: [Materias]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           forma: uuid
 *     responses:
 *       200:
 *          description: Materia encontrada
 */
router.get("/:id", materiaController.getById);

/**
 * @swagger
 * /api/materias:
 *   post:
 *     summary: Crear una materia
 *     tags: [Materias]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *             properties:
 *               nombre:
 *                 type: string
 *     responses:
 *       200:
 *          description: Materia creada
 */
router.post("/", materiaController.create);

/**
 * @swagger
 * /api/materias/{id}:
 *   put:
 *     summary: Actualizar una materia por ID
 *     tags: [Materias]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           forma: uuid
 *         description: ID de la materia a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Matemática
 *     responses:
 *       200:
 *         description: Materia actualizada correctamente
 *       404:
 *         description: Materia no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.put("/:id", materiaController.update);

/**
 * @swagger
 * /api/materias/{id}:
 *   delete:
 *     summary: Eliminar una materia
 *     tags: [Materias]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Materia eliminada
 *       404:
 *         description: Materia no encontrada
 */
router.delete("/:id", materiaController.delete);

// Ruta extra con lógica específica (opcional)
router.get("/nombre/:nombre", materiaController.getByNombre);

module.exports = router;