const express = require("express");
const router = express.Router();
const { Aula, Edificio } = require("../models");

/**
 * @swagger
 * tags:
 *   - name: Aulas
 *     description: Endpoints para gestión de aulas
 */

/**
 * @swagger
 * /api/aulas:
 *   get:
 *     summary: Obtener todas las aulas
 *     tags: [Aulas]
 */
router.get("/", async (req, res, next) => {
  try {
    const aulas = await Aula.findAll({
      include: {
        association: "edificio"
      }
    });
    res.json(aulas);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/aulas/{id}:
 *   get:
 *     summary: Obtener un aula por ID
 *     tags: [Aulas]
 */
router.get("/:id", async (req, res, next) => {
  try {
    const aula = await Aula.findByPk(req.params.id, {
      include: {
        association: "edificio"
      }
    });

    if (!aula) {
      const error = new Error("Aula no encontrada");
      error.status = 404;
      return next(error);
    }

    res.json(aula);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/aulas:
 *   post:
 *     summary: Crear un aula
 *     tags: [Aulas]
 */
router.post("/", async (req, res, next) => {
  try {
    const { edificioId } = req.body;

    // Validar datos
    if (!edificioId) {
      const error = new Error("Falta edificioId");
      error.status = 400;
      return next(error);
    }

    // Validar que el edificio exista
    const edificio = await Edificio.findByPk(edificioId);
    if (!edificio) {
      const error = new Error("Edificio inválido");
      error.status = 400;
      return next(error);
    }

    const aula = await Aula.create(req.body);
    res.status(201).json(aula);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/aulas/{id}:
 *   put:
 *     summary: Actualizar un aula
 *     tags: [Aulas]
 */
router.put("/:id", async (req, res, next) => {
  try {
    // Validar edificio si se envía
    if (req.body.edificioId) {
      const edificio = await Edificio.findByPk(req.body.edificioId);
      if (!edificio) {
        const error = new Error("Edificio inválido");
        error.status = 400;
        return next(error);
      }
    }

    const [updated] = await Aula.update(req.body, {
      where: { aulaId: req.params.id }
    });

    if (!updated) {
      const error = new Error("Aula no encontrada");
      error.status = 404;
      return next(error);
    }

    res.json({ message: "Aula actualizada" });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/aulas/{id}:
 *   delete:
 *     summary: Eliminar un aula
 *     tags: [Aulas]
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await Aula.destroy({
      where: { aulaId: req.params.id }
    });

    if (!deleted) {
      const error = new Error("Aula no encontrada");
      error.status = 404;
      return next(error);
    }

    res.json({ message: "Aula eliminada" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;