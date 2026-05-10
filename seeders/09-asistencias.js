'use strict';

const { randomUUID } = require('crypto');

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('asistencias', [
      {
        asistenciaId: randomUUID(),

        fecha: '2026-04-22',

        tipoUsuario: 'ESTUDIANTE',
        usuarioId: '77777777',

        horaRegistro: '16:07:00',

        estado: 'PRESENTE',

        comisionId: '55555555-5555-5555-5555-555555555555',

        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('asistencias', null, {});
  }
};