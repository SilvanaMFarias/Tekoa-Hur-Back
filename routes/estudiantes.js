const express = require("express");
const router = express.Router();
const { Estudiante } = require("../models");

/**
 * @swagger
 * tags:
 *   - name: Estudiantes
 *     description: Endpoints para gestión de estudiantes
 */

/**
 * @swagger
 * /api/estudiantes:
 *   get:
 *     summary: Obtener todos los estudiantes
 *     tags: [Estudiantes]
 */
router.get("/", async (req, res, next) => {
  try {
    const estudiantes = await Estudiante.findAll();
    res.json(estudiantes);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/estudiantes/{dni}:
 *   get:
 *     summary: Obtener un estudiante por DNI
 *     tags: [Estudiantes]
 */
router.get("/:dni", async (req, res, next) => {
  try {
    const estudiante = await Estudiante.findByPk(req.params.dni);

    if (!estudiante) {
      const error = new Error("Estudiante no encontrado");
      error.status = 404;
      return next(error);
    }

    res.json(estudiante);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/estudiantes:
 *   post:
 *     summary: Crear un estudiante
 *     tags: [Estudiantes]
 */
router.post("/", async (req, res, next) => {
  try {
    const { dni, nombre_apellido } = req.body;

    // Validación básica
    if (!dni || !nombre_apellido) {
      const error = new Error("Faltan datos obligatorios");
      error.status = 400;
      return next(error);
    }

    const estudiante = await Estudiante.create(req.body);
    res.status(201).json(estudiante);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/estudiantes/{dni}:
 *   put:
 *     summary: Actualizar un estudiante
 *     tags: [Estudiantes]
 */
router.put("/:dni", async (req, res, next) => {
  try {
    const [updated] = await Estudiante.update(req.body, {
      where: { dni: req.params.dni }
    });

    if (!updated) {
      const error = new Error("Estudiante no encontrado");
      error.status = 404;
      return next(error);
    }

    res.json({ message: "Estudiante actualizado" });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/estudiantes/{dni}:
 *   delete:
 *     summary: Eliminar un estudiante
 *     tags: [Estudiantes]
 */
router.delete("/:dni", async (req, res, next) => {
  try {
    const deleted = await Estudiante.destroy({
      where: { dni: req.params.dni }
    });

    if (!deleted) {
      const error = new Error("Estudiante no encontrado");
      error.status = 404;
      return next(error);
    }

    res.json({ message: "Estudiante eliminado" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;