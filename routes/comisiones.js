// routes/comisiones.js
const express = require("express");
const router = express.Router();
const { Comision } = require("../models");
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
 */
router.get("/", async (req, res, next) => {
  try {
    const comisiones = await Comision.findAll();
    res.json(comisiones);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/comisiones/{id}:
 *   get:
 *     summary: Obtener una comisión por ID
 *     tags: [Comisiones]
 */
router.get("/:id", async (req, res, next) => {
  try {
    const comision = await Comision.findByPk(req.params.id);

    if (!comision) {
      const error = new Error("Comisión no encontrada");
      error.status = 404;
      return next(error);
    }

    res.json(comision);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/comisiones:
 *   post:
 *     summary: Crear una comisión
 *     tags: [Comisiones]
 */
router.post("/", async (req, res, next) => {
  try {
    const { cod_comision, materiaId, profesorId } = req.body;

    // Validación básica
    if (!cod_comision || !materiaId || !profesorId) {
      const error = new Error("Faltan datos obligatorios");
      error.status = 400;
      return next(error);
    }

    const comision = await Comision.create(req.body);
    res.status(201).json(comision);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/comisiones/{id}:
 *   put:
 *     summary: Actualizar una comisión
 *     tags: [Comisiones]
 */
router.put("/:id", async (req, res, next) => {
  try {
    const [updated] = await Comision.update(req.body, {
      where: { comisionId: req.params.id }
    });

    if (!updated) {
      const error = new Error("Comisión no encontrada");
      error.status = 404;
      return next(error);
    }

    res.json({ message: "Comisión actualizada" });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/comisiones/{id}:
 *   delete:
 *     summary: Eliminar una comisión
 *     tags: [Comisiones]
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await Comision.destroy({
      where: { comisionId: req.params.id }
    });

    if (!deleted) {
      const error = new Error("Comisión no encontrada");
      error.status = 404;
      return next(error);
    }

    res.json({ message: "Comisión eliminada" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;