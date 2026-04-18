const express = require("express");
const router = express.Router();
const { Profesor } = require("../models");

/**
 * @swagger
 * tags:
 *   - name: Profesores
 *     description: Endpoints para gestión de profesores
 */

/**
 * @swagger
 * /api/profesores:
 *   get:
 *     summary: Obtener todos los profesores
 *     tags: [Profesores]
 */
router.get("/", async (req, res, next) => {
  try {
    const profesores = await Profesor.findAll();
    res.json(profesores);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/profesores/{id}:
 *   get:
 *     summary: Obtener un profesor por ID
 *     tags: [Profesores]
 */
router.get("/:id", async (req, res, next) => {
  try {
    const profesor = await Profesor.findByPk(req.params.id);

    if (!profesor) {
      const error = new Error("Profesor no encontrado");
      error.status = 404;
      return next(error);
    }

    res.json(profesor);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/profesores:
 *   post:
 *     summary: Crear un profesor
 *     tags: [Profesores]
 */
router.post("/", async (req, res, next) => {
  try {
    const { dni, nombre_apellido, email } = req.body;

    // Validación básica
    if (!dni || !nombre_apellido || !email) {
      const error = new Error("Faltan datos obligatorios");
      error.status = 400;
      return next(error);
    }

    const profesor = await Profesor.create(req.body);
    res.status(201).json(profesor);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/profesores/{id}:
 *   put:
 *     summary: Actualizar un profesor
 *     tags: [Profesores]
 */
router.put("/:id", async (req, res, next) => {
  try {
    const [updated] = await Profesor.update(req.body, {
      where: { profesorId: req.params.id }
    });

    if (!updated) {
      const error = new Error("Profesor no encontrado");
      error.status = 404;
      return next(error);
    }

    res.json({ message: "Profesor actualizado" });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/profesores/{id}:
 *   delete:
 *     summary: Eliminar un profesor
 *     tags: [Profesores]
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await Profesor.destroy({
      where: { profesorId: req.params.id }
    });

    if (!deleted) {
      const error = new Error("Profesor no encontrado");
      error.status = 404;
      return next(error);
    }

    res.json({ message: "Profesor eliminado" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;