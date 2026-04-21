// routes/edificios.js
const express = require("express");
const router = express.Router();
const { Edificio } = require("../models");
const edificioController = require("../controllers/edificioController");

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
router.get("/", async (req, res, next) => {
  try {
    const edificios = await Edificio.findAll();
    res.json(edificios);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/edificios/{id}:
 *   get:
 *     summary: Obtener un edificio por ID
 *     tags: [Edificios]
 */
router.get("/:id", async (req, res, next) => {
  try {
    const edificio = await Edificio.findByPk(req.params.id);

    if (!edificio) {
      const error = new Error("Edificio no encontrado");
      error.status = 404;
      return next(error);
    }

    res.json(edificio);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/edificios:
 *   post:
 *     summary: Crear un edificio
 *     tags: [Edificios]
 */
router.post("/", async (req, res, next) => {
  try {
    const { nombre } = req.body;

    // Validación básica
    if (!nombre) {
      const error = new Error("El nombre es obligatorio");
      error.status = 400;
      return next(error);
    }

    const edificio = await Edificio.create(req.body);
    res.status(201).json(edificio);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/edificios/{id}:
 *   put:
 *     summary: Actualizar un edificio
 *     tags: [Edificios]
 */
router.put("/:id", async (req, res, next) => {
  try {
    const [updated] = await Edificio.update(req.body, {
      where: { edificioId: req.params.id }
    });

    if (!updated) {
      const error = new Error("Edificio no encontrado");
      error.status = 404;
      return next(error);
    }

    res.json({ message: "Edificio actualizado" });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/edificios/{id}:
 *   delete:
 *     summary: Eliminar un edificio
 *     tags: [Edificios]
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await Edificio.destroy({
      where: { edificioId: req.params.id }
    });

    if (!deleted) {
      const error = new Error("Edificio no encontrado");
      error.status = 404;
      return next(error);
    }

    res.json({ message: "Edificio eliminado" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;