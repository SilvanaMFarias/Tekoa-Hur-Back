// ============================================================
// migrations/20260521120000-qr-espacio-y-atributos.js
// ============================================================
// Esta migración hace 3 cosas:
//
//  1. Crea la tabla `aula_atributos` (1:1 con aulas).
//  2. Crea la tabla `espacio_qr` (QR permanente del admin).
//  3. Agrega `qrToken` y `qrTokenExpira` a `comisiones` (QR del docente).
//
// Las 3 operaciones son idempotentes (usan describeTable + try/catch),
// así que correrla más de una vez no rompe nada.
//
// Correr con:
//   npx sequelize-cli db:migrate
// O si se usa sync({alter:true}) en sync.js, esta migración no hace falta:
// los models nuevos crean automáticamente las tablas. Igual la dejamos por
// si en producción se quiere usar migrations en vez de sync.
// ============================================================

"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1. Tabla aula_atributos ────────────────────────────────
    const aulaAtributosExiste = await queryInterface
      .describeTable("aula_atributos")
      .then(() => true)
      .catch(() => false);

    if (!aulaAtributosExiste) {
      await queryInterface.createTable("aula_atributos", {
        aulaId: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          references: { model: "aulas", key: "aulaId" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE", // si se borra el aula, su fila de atributos también
        },
        capacidad: { type: Sequelize.INTEGER, allowNull: true },
        tipoAula: { type: Sequelize.STRING, allowNull: true },
        esLaboratorioInformatico: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        cantidadPC: { type: Sequelize.INTEGER, allowNull: true },
        descripcion: { type: Sequelize.TEXT, allowNull: true },
        equipamiento: {
          // ARRAY solo funciona en Postgres. Si la DB es otra,
          // cambiar a Sequelize.STRING (separado por comas).
          type: Sequelize.ARRAY(Sequelize.STRING),
          allowNull: true,
          defaultValue: [],
        },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
      });
    }

    // ── 2. Tabla espacio_qr ────────────────────────────────────
    const espacioQrExiste = await queryInterface
      .describeTable("espacio_qr")
      .then(() => true)
      .catch(() => false);

    if (!espacioQrExiste) {
      await queryInterface.createTable("espacio_qr", {
        espacioQrId: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal("gen_random_uuid()"),
          primaryKey: true,
        },
        token: {
          type: Sequelize.STRING(64),
          allowNull: false,
          unique: true,
        },
        aulaId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: "aulas", key: "aulaId" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        edificioId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: "edificios", key: "edificioId" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        activo: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        generadoPor: { type: Sequelize.STRING, allowNull: true },
        desactivadoEn: { type: Sequelize.DATE, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
      });

      // Índice parcial: garantiza UN solo QR activo por aula.
      // Si fallara en una DB que no soporta índices parciales,
      // se reemplaza por un índice común y la regla la fuerza el código.
      try {
        await queryInterface.addIndex("espacio_qr", ["aulaId"], {
          unique: true,
          where: { activo: true },
          name: "espacio_qr_aula_activo_unico",
        });
      } catch (e) {
        console.warn(
          "[migration] No se pudo crear índice parcial. " +
            "La unicidad del QR activo por aula la garantiza el código."
        );
      }

      await queryInterface.addIndex("espacio_qr", ["token"]);
    }

    // ── 3. Agregar qrToken y qrTokenExpira a comisiones ────────
    const comisiones = await queryInterface
      .describeTable("comisiones")
      .catch(() => null);

    if (comisiones && !comisiones.qrToken) {
      await queryInterface.addColumn("comisiones", "qrToken", {
        type: Sequelize.STRING(64),
        allowNull: true,
        unique: true,
      });
    }

    if (comisiones && !comisiones.qrTokenExpira) {
      await queryInterface.addColumn("comisiones", "qrTokenExpira", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Rollback: borra tablas nuevas y columnas agregadas.
    // No tocamos rtoken/rtokenExpira en aulas porque eso es de otra
    // migración previa.
    await queryInterface.dropTable("espacio_qr").catch(() => {});
    await queryInterface.dropTable("aula_atributos").catch(() => {});

    const comisiones = await queryInterface
      .describeTable("comisiones")
      .catch(() => null);

    if (comisiones?.qrToken) {
      await queryInterface.removeColumn("comisiones", "qrToken");
    }
    if (comisiones?.qrTokenExpira) {
      await queryInterface.removeColumn("comisiones", "qrTokenExpira");
    }
  },
};
