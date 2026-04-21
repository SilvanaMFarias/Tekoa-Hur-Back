// routes/materias.js
const express = require("express");
const router = express.Router();
const { Materia } = require("../models");
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
 */
router.get("/", async (req, res, next) => {
  try {
    const materias = await Materia.findAll();
    res.json(materias);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/materias/{id}:
 *   get:
 *     summary: Obtener una materia por ID
 *     tags: [Materias]
 */
router.get("/:id", async (req, res, next) => {
  try {
    const materia = await Materia.findByPk(req.params.id);

    if (!materia) {
      const error = new Error("Materia no encontrada");
      error.status = 404;
      return next(error);
    }

    res.json(materia);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/materias:
 *   post:
 *     summary: Crear una materia
 *     tags: [Materias]
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

    const materia = await Materia.create(req.body);
    res.status(201).json(materia);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/materias/{id}:
 *   put:
 *     summary: Actualizar una materia
 *     tags: [Materias]
 */
router.put("/:id", async (req, res, next) => {
  try {
    const [updated] = await Materia.update(req.body, {
      where: { materiaId: req.params.id }
    });

    if (!updated) {
      const error = new Error("Materia no encontrada");
      error.status = 404;
      return next(error);
    }

    res.json({ message: "Materia actualizada" });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/materias/{id}:
 *   delete:
 *     summary: Eliminar una materia
 *     tags: [Materias]
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await Materia.destroy({
      where: { materiaId: req.params.id }
    });

    if (!deleted) {
      const error = new Error("Materia no encontrada");
      error.status = 404;
      return next(error);
    }

    res.json({ message: "Materia eliminada" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;