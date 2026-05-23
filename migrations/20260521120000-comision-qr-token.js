// ============================================================
// migrations/20260521120000-r1-01-comision-qr-token.js
// ============================================================
// TARJETA R1-01: agrega los campos qrToken y qrTokenExpira a la
// tabla comisiones.
//
// Esta migración es IDEMPOTENTE: usa describeTable() para chequear
// si las columnas existen antes de agregarlas, así correrla dos
// veces no rompe nada.
//
// Correr con:
//   npx sequelize-cli db:migrate
// ============================================================

"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const comisiones = await queryInterface
      .describeTable("comisiones")
      .catch(() => null);

    if (!comisiones) {
      console.warn("[R1-01] La tabla comisiones no existe todavía. Saltando.");
      return;
    }

    if (!comisiones.qrToken) {
      await queryInterface.addColumn("comisiones", "qrToken", {
        type: Sequelize.STRING(64),
        allowNull: true,
        unique: true,
      });
    }

    if (!comisiones.qrTokenExpira) {
      await queryInterface.addColumn("comisiones", "qrTokenExpira", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
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
