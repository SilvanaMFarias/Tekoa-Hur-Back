// routes/matriculas.js
const express = require("express");
const router = express.Router();
const { Matricula } = require("../models");
const matriculaController = require("../controllers/matriculaController");

/**
 * @swagger
 * tags:
 *   - name: Matriculas
 *     description: Endpoints para gestión de matrículas (inscripciones)
 */

/**
 * @swagger
 * /api/matriculas:
 *   get:
 *     summary: Obtener todas las matrículas
 *     tags: [Matriculas]
 */
router.get("/", async (req, res, next) => {
  try {
    const matriculas = await Matricula.findAll();
    res.json(matriculas);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/matriculas/{id}:
 *   get:
 *     summary: Obtener una matrícula por ID
 *     tags: [Matriculas]
 */
router.get("/:id", async (req, res, next) => {
  try {
    const matricula = await Matricula.findByPk(req.params.id);

    if (!matricula) {
      const error = new Error("Matrícula no encontrada");
      error.status = 404;
      return next(error);
    }

    res.json(matricula);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/matriculas:
 *   post:
 *     summary: Crear una matrícula
 *     tags: [Matriculas]
 */
router.post("/", async (req, res, next) => {
  try {
    const { estudianteDni, comisionId, fechaInscripcion } = req.body;

    // Validación básica
    if (!estudianteDni || !comisionId || !fechaInscripcion) {
      const error = new Error("Faltan datos obligatorios");
      error.status = 400;
      return next(error);
    }

    const matricula = await Matricula.create(req.body);
    res.status(201).json(matricula);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/matriculas/{id}:
 *   put:
 *     summary: Actualizar una matrícula
 *     tags: [Matriculas]
 */
router.put("/:id", async (req, res, next) => {
  try {
    const [updated] = await Matricula.update(req.body, {
      where: { matriculaId: req.params.id }
    });

    if (!updated) {
      const error = new Error("Matrícula no encontrada");
      error.status = 404;
      return next(error);
    }

    res.json({ message: "Matrícula actualizada" });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/matriculas/{id}:
 *   delete:
 *     summary: Eliminar una matrícula
 *     tags: [Matriculas]
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await Matricula.destroy({
      where: { matriculaId: req.params.id }
    });

    if (!deleted) {
      const error = new Error("Matrícula no encontrada");
      error.status = 404;
      return next(error);
    }

    res.json({ message: "Matrícula eliminada" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;