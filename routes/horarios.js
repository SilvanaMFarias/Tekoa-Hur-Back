const express = require("express");
const router = express.Router();
const { Horario, Comision, Aula } = require("../models");
const horarioController = require("../controllers/horarioController");

/**
 * @swagger
 * tags:
 *   - name: Horarios
 *     description: Endpoints para gestión de horarios
 */

/**
 * @swagger
 * /api/horarios:
 *   get:
 *     summary: Obtener todos los horarios
 *     tags: [Horarios]
 */
router.get("/", async (req, res, next) => {
  try {
    const horarios = await Horario.findAll({
      include: [
        { model: Comision, as: "comision" },
        { model: Aula, as: "aula" }
      ]
    });
    res.json(horarios);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/horarios/{id}:
 *   get:
 *     summary: Obtener un horario por ID
 *     tags: [Horarios]
 */
router.get("/:id", async (req, res, next) => {
  try {
    const horario = await Horario.findByPk(req.params.id, {
      include: [
        { model: Comision, as: "comision" },
        { model: Aula, as: "aula" }
      ]
    });

    if (!horario) {
      const error = new Error("Horario no encontrado");
      error.status = 404;
      return next(error);
    }

    res.json(horario);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/horarios:
 *   post:
 *     summary: Crear un horario
 *     tags: [Horarios]
 */
router.post("/", async (req, res, next) => {
  try {
    const {
      diaSemana,
      horaDesde,
      horaHasta,
      periodicidad,
      comisionId,
      aulaId
    } = req.body;

    // Validación básica
    if (!diaSemana || !horaDesde || !horaHasta || !periodicidad || !comisionId || !aulaId) {
      const error = new Error("Faltan datos obligatorios");
      error.status = 400;
      return next(error);
    }

    const horario = await Horario.create(req.body);
    res.status(201).json(horario);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/horarios/{id}:
 *   put:
 *     summary: Actualizar un horario
 *     tags: [Horarios]
 */
router.put("/:id", async (req, res, next) => {
  try {
    const [updated] = await Horario.update(req.body, {
      where: { horarioId: req.params.id }
    });

    if (!updated) {
      const error = new Error("Horario no encontrado");
      error.status = 404;
      return next(error);
    }

    res.json({ message: "Horario actualizado" });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/horarios/{id}:
 *   delete:
 *     summary: Eliminar un horario
 *     tags: [Horarios]
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await Horario.destroy({
      where: { horarioId: req.params.id }
    });

    if (!deleted) {
      const error = new Error("Horario no encontrado");
      error.status = 404;
      return next(error);
    }

    res.json({ message: "Horario eliminado" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;