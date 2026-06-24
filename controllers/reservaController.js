// ============================================================
// controllers/reservaController.js
// ============================================================
// Controller de Reservas
//
// Función única: TRADUCIR entre HTTP y el reservaService.
//
// Cada handler hace 3 cosas:
//   1. Extrae datos del request (body, params, query, req.usuario)
//   2. Llama al service correspondiente
//   3. Devuelve la respuesta como JSON con el status code adecuado
//
// Sigue el patrón acá no hay
// lógica de negocio, solo orquestación.
//
// Los errores se delegan al middleware central con next(error).
// El middleware ya sabe cómo manejar AppError (status + message).
// ============================================================

const reservaService = require("../services/reservaService");

class ReservaController {
  // ============================================================
  // GET /api/reservas
  // ============================================================
  // Lista reservas. Acepta filtros opcionales como query params:
  //   ?aulaId=...&estado=confirmada&desde=2026-06-01&hasta=2026-07-01
  async listar(req, res, next) {
    try {
      // Convertimos los query strings a tipos correctos.
      // Recordar: req.query SIEMPRE viene como strings.
      const filtros = {};

      if (req.query.aulaId) filtros.aulaId = req.query.aulaId;
      if (req.query.estado) filtros.estado = req.query.estado;
      if (req.query.desde) filtros.desde = new Date(req.query.desde);
      if (req.query.hasta) filtros.hasta = new Date(req.query.hasta);

      const reservas = await reservaService.listar(filtros);
      res.json(reservas);
    } catch (error) {
      next(error);
    }
  }

  // ============================================================
  // GET /api/reservas/ocupacion-global
  // ============================================================
  // Devuelve eventos de TODAS las aulas en un rango. Opcionalmente
  // filtra por edificio. Sirve para la vista "agenda global" donde
  // el admin ve qué pasa en toda la facultad al mismo tiempo.
  //
  // Query params:
  //   - desde      (obligatorio)  → YYYY-MM-DD o ISO
  //   - hasta      (obligatorio)  → YYYY-MM-DD o ISO
  //   - edificioId (opcional)
  async obtenerOcupacionGlobal(req, res, next) {
    try {
      const { desde, hasta, edificioId } = req.query;
      if (!desde || !hasta) {
        return res.status(400).json({
          error: "Los parámetros 'desde' y 'hasta' son obligatorios.",
        });
      }

      const resultado = await reservaService.obtenerOcupacionGlobal({
        desde: new Date(desde),
        hasta: new Date(hasta),
        edificioId: edificioId || null,
      });

      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  // ============================================================
  // GET /api/reservas/:reservaId
  // ============================================================
  async obtenerPorId(req, res, next) {
    try {
      const reserva = await reservaService.obtenerPorId(req.params.reservaId);
      res.json(reserva);
    } catch (error) {
      next(error);
    }
  }

  // ============================================================
  // POST /api/reservas/verificar-conflictos
  // ============================================================
  // Permite al frontend chequear conflictos ANTES de crear.
  // No persiste nada en la BD. Es idempotente: llamarlo N veces
  // da siempre el mismo resultado.
  //
  // Body: { aulaId, fechaInicio, fechaFin, reservaIdExcluir? }
  async verificarConflictos(req, res, next) {
    try {
      const { aulaId, fechaInicio, fechaFin, reservaIdExcluir } = req.body;

      const resultado = await reservaService.verificarConflictos({
        aulaId,
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        reservaIdExcluir,
      });

      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  // ============================================================
  // POST /api/reservas
  // ============================================================
  // Crea una nueva reserva.
  // El usuarioId se toma del JWT (req.usuario) — no del body —
  // por seguridad: no queremos que el cliente diga "creá esto
  // como si lo hubiera hecho otro usuario".
  //
  // Body: { aulaId, motivo, fechaInicio, fechaFin, descripcion?, forzar? }
  async crear(req, res, next) {
    try {
      const datos = {
        aulaId: req.body.aulaId,
        motivo: req.body.motivo,
        fechaInicio: new Date(req.body.fechaInicio),
        fechaFin: new Date(req.body.fechaFin),
        descripcion: req.body.descripcion,
        forzar: Boolean(req.body.forzar),
      };

      // El usuarioId del JWT (puesto por jwtAuth middleware)
      const usuarioId = req.usuario.usuarioId;

      const reserva = await reservaService.crear(datos, usuarioId);

      res.status(201).json({
        message: "Reserva creada correctamente",
        reserva,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================
  // PUT /api/reservas/:reservaId
  // ============================================================
  // Edita una reserva existente.
  // Body: cualquier subconjunto de { aulaId, motivo, fechaInicio,
  //       fechaFin, descripcion, forzar }
  async actualizar(req, res, next) {
    try {
      const datos = {};

      // Solo incluimos los campos que vinieron en el body.
      // Si un campo no viene, no se toca.
      if (req.body.aulaId !== undefined) datos.aulaId = req.body.aulaId;
      if (req.body.motivo !== undefined) datos.motivo = req.body.motivo;
      if (req.body.fechaInicio !== undefined) {
        datos.fechaInicio = new Date(req.body.fechaInicio);
      }
      if (req.body.fechaFin !== undefined) {
        datos.fechaFin = new Date(req.body.fechaFin);
      }
      if (req.body.descripcion !== undefined) {
        datos.descripcion = req.body.descripcion;
      }
      if (req.body.forzar !== undefined) datos.forzar = Boolean(req.body.forzar);

      const reserva = await reservaService.actualizar(
        req.params.reservaId,
        datos
      );

      res.json({
        message: "Reserva actualizada correctamente",
        reserva,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================
  // DELETE /api/reservas/:reservaId
  // ============================================================
  // Cancela una reserva (soft delete: cambia estado a "cancelada").
  // No se borra de la BD para mantener el histórico.
  async cancelar(req, res, next) {
    try {
      const reserva = await reservaService.cancelar(req.params.reservaId);

      res.json({
        message: "Reserva cancelada correctamente",
        reserva,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReservaController();
