'use strict';

const { randomUUID } = require('crypto');

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('asistencias', [
      {
        asistenciaId: randomUUID(),

        fecha: '2026-05-08',

        tipoUsuario: 'ESTUDIANTE',
        usuarioId: '11111111',

        horaRegistro: '18:02:00',

        estado: 'PRESENTE',

        comisionId: '4aa06cd3-7478-4967-9ce6-428d9f150925',

        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('asistencias', null, {});
  }
};