'use strict';

const { randomUUID } = require('crypto');

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('asistencias', [
      {
        asistenciaId: randomUUID(),
        fecha: '2026-04-22', // new Date()
        tipoUsuario: 'ESTUDIANTE',
        usuarioId: '77777775',
        horaRegistro: '16:07:00',
        estado: 'PRESENTE',
        comisionId: '51f1afee-28ed-435e-a1ba-75baa87061ff',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('asistencias', null, {});
  }
};