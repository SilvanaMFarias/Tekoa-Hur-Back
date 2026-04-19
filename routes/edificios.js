const express = require("express");
const router = express.Router();
const { Edificio } = require("../models");
const edificioController = require("../controllers/edificioController");
const validateRequiredFields = require("../middleware/requiredFields");

/**
 * @swagger
 * tags:
 *   - name: Edificios
 *     description: Endpoints para gestión de edificios
 */

/**
 * @swagger
 * /api/edificios:
 *   get:
 *     summary: Obtener todos los edificios
 *     tags: [Edificios]
 */
router.get("/", edificioController.getAll);

/**
 * @swagger
 * /api/edificios/{id}:
 *   get:
 *     summary: Obtener un edificio por ID
 *     tags: [Edificios]
 */
router.get("/:id", edificioController.getById);

/**
 * @swagger
 * /api/edificios:
 *   post:
 *     summary: Crear un edificio
 *     tags: [Edificios]
 */
router.post("/", 
  validateRequiredFields(['nombre']),
  edificioController.create
);

/**
 * @swagger
 * /api/edificios/{id}:
 *   put:
 *     summary: Actualizar un edificio
 *     tags: [Edificios]
 */
router.put("/:id", edificioController.update);

/**
 * @swagger
 * /api/edificios/{id}:
 *   delete:
 *     summary: Eliminar un edificio
 *     tags: [Edificios]
 */
router.delete("/:id", edificioController.delete);

module.exports = router;