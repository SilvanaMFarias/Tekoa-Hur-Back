const express = require("express");
const router = express.Router();
const { Asistencia, Comision } = require("../models");
const asistenciaController = require("../controllers/asistenciaController");

/**
 * @swagger
 * tags:
 *   - name: Asistencias
 *     description: Endpoints para gestión de asistencias
 */

/**
 * @swagger
 * /api/asistencias:
 *   get:
 *     summary: Obtener todas las asistencias
 *     tags: [Asistencias]
 */
router.get("/", async (req, res, next) => {
  try {
    const asistencias = await Asistencia.findAll({
      include: [{ model: Comision, as: "comision" }]
    });
    res.json(asistencias);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/asistencias/{id}:
 *   get:
 *     summary: Obtener una asistencia por ID
 *     tags: [Asistencias]
 */
router.get("/:id", async (req, res, next) => {
  try {
    const asistencia = await Asistencia.findByPk(req.params.id, {
      include: [{ model: Comision, as: "comision" }]
    });

    if (!asistencia) {
      const error = new Error("Asistencia no encontrada");
      error.status = 404;
      return next(error);
    }

    res.json(asistencia);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/asistencias:
 *   post:
 *     summary: Registrar una asistencia
 *     tags: [Asistencias]
 */
router.post("/", async (req, res, next) => {
  try {
    const {
      fecha,
      horaRegistro,
      tipoUsuario,
      usuarioId,
      estado,
      comisionId
    } = req.body;

    // Validación básica
    if (!fecha || !horaRegistro || !tipoUsuario || !usuarioId || !estado || !comisionId) {
      const error = new Error("Faltan datos obligatorios");
      error.status = 400;
      return next(error);
    }

    const asistencia = await Asistencia.create(req.body);
    res.status(201).json(asistencia);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/asistencias/{id}:
 *   put:
 *     summary: Actualizar una asistencia
 *     tags: [Asistencias]
 */
router.put("/:id", async (req, res, next) => {
  try {
    const [updated] = await Asistencia.update(req.body, {
      where: { asistenciaId: req.params.id }
    });

    if (!updated) {
      const error = new Error("Asistencia no encontrada");
      error.status = 404;
      return next(error);
    }

    res.json({ message: "Asistencia actualizada" });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/asistencias/{id}:
 *   delete:
 *     summary: Eliminar una asistencia
 *     tags: [Asistencias]
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await Asistencia.destroy({
      where: { asistenciaId: req.params.id }
    });

    if (!deleted) {
      const error = new Error("Asistencia no encontrada");
      error.status = 404;
      return next(error);
    }

    res.json({ message: "Asistencia eliminada" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;