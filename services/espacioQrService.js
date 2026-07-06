// ============================================================
// services/espacioQrService.js
// ============================================================
// Maneja la lógica del QR permanente del aula:
//   - generar(): crea un QR nuevo desactivando el anterior
//                (operación atómica con transacción)
//   - desactivar(): da de baja un QR explícitamente
//   - listar(): trae todos los QRs
//   - resolverPorToken(): cuando alguien escanea, devuelve toda
//                         la info del aula
// ============================================================

const { EspacioQR, Aula, Edificio } = require("../models");
const sequelize = require("../config/database");
const AppError = require("../errors/AppError");

class EspacioQrService {
  /**
   * Genera un QR nuevo para un aula.
   * Si ya había uno activo, lo desactiva primero.
   * Todo dentro de una TRANSACCIÓN para que sea atómico.
   *
   * @param {Object} params
   * @param {string} params.aulaId - UUID del aula
   * @param {string} params.adminDni - DNI del admin que genera (auditoría)
   * @returns {Promise<EspacioQR>} - El QR recién creado
   */
  async generar({ aulaId, adminDni }) {
    if (!aulaId) {
      throw AppError.badRequest("aulaId es requerido");
    }

    // Verificar que el aula exista (con su edificio)
    const aula = await Aula.findByPk(aulaId);
    if (!aula) {
      throw AppError.notFound("Aula no encontrada");
    }

    // ── TRANSACCIÓN: desactivar viejo + crear nuevo ───────
    // Una transacción garantiza atomicidad: o se hacen las DOS
    // operaciones, o ninguna. Si falla la segunda, la primera
    // se reversa (ROLLBACK).
    //
    // Sin transacción podríamos quedar en un estado intermedio:
    // viejo desactivado y nuevo nunca creado, y el aula queda
    // sin QR activo cuando debería tener uno.
    const resultado = await sequelize.transaction(async (t) => {
      // 1. Desactivar QRs activos previos del aula
      await EspacioQR.update(
        {
          activo: false,
          desactivadoEn: new Date(),
        },
        {
          where: { aulaId, activo: true },
          transaction: t,
        }
      );

      // 2. Crear el QR nuevo
      const nuevoQR = await EspacioQR.create(
        {
          token: EspacioQR.generarToken(),
          aulaId,
          edificioId: aula.edificioId,
          activo: true,
          generadoPor: adminDni || null,
        },
        { transaction: t }
      );

      return nuevoQR;
    });

    return resultado;
  }

  /**
   * Desactiva un QR específico. Idempotente:
   * si ya está desactivado, no hace nada.
   *
   * @param {string} espacioQrId - UUID del QR
   * @returns {Promise<Object>} - { ok: true, desactivado: boolean }
   */
  async desactivar(espacioQrId) {
    if (!espacioQrId) {
      throw AppError.badRequest("espacioQrId es requerido");
    }

    const qr = await EspacioQR.findByPk(espacioQrId);
    if (!qr) {
      throw AppError.notFound("QR no encontrado");
    }

    // Si ya está desactivado, no hacemos nada (idempotente)
    if (!qr.activo) {
      return { ok: true, desactivado: false };
    }

    await qr.update({
      activo: false,
      desactivadoEn: new Date(),
    });

    return { ok: true, desactivado: true };
  }

  /**
   * Lista todos los QRs con info del aula y edificio.
   *
   * @param {Object} params
   * @param {boolean} params.soloActivos - Filtrar solo los activos
   * @returns {Promise<Array>}
   */
  async listar({ soloActivos = false } = {}) {
    const where = {};
    if (soloActivos) where.activo = true;

    const qrs = await EspacioQR.findAll({
      where,
      include: [
        { model: Aula, as: "aula" },
        { model: Edificio, as: "edificio" },
      ],
      order: [["createdAt", "DESC"]],
    });

    return qrs;
  }

  /**
   * Resuelve un token público y devuelve TODA la info del aula
   * para mostrar al usuario que escaneó.
   *
   * Si el token no existe o no está activo, devuelve 403.
   * NO tira info de tokens inválidos para evitar enumeración.
   *
   * @param {string} token - Token del QR escaneado
   * @returns {Promise<Object>} - Info pública del aula
   */
  async resolverPorToken(token) {
    if (!token) {
      throw AppError.badRequest("token es requerido");
    }

    const qr = await EspacioQR.findOne({
      where: { token, activo: true },
      include: [
        {
          model: Aula,
          as: "aula",
          include: [{ model: Edificio, as: "edificio" }],
        },
      ],
    });

    if (!qr) {
      throw AppError.forbidden("QR inválido o desactivado", "INVALID_QR"); //arreglar 404
    }

    // Intentar cargar atributos si existen (puede no haber)
    const { AulaAtributos } = require("../models");
    const atributos = await AulaAtributos.findByPk(qr.aulaId);

    // acomodar por tema de funcionalidad include.. y agregar un left join
    return {
      aula: {
        aulaId: qr.aula.aulaId,
        sector: qr.aula.sector,
        numero: qr.aula.numero,
        nombreCompleto: `${qr.aula.sector}-${qr.aula.numero}`,
      },
      edificio: qr.aula.edificio
        ? {
            edificioId: qr.aula.edificio.edificioId,
            nombre: qr.aula.edificio.nombre,
          }
        : null,
      atributos: atributos || null,
    };
  }
}

module.exports = new EspacioQrService();
