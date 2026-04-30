'use strict';

const { randomUUID } = require('crypto');

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('asistencias', [
      {
        asistenciaId: randomUUID(),
        fecha: '2026-04-22', // new Date()
        tipoUsuario: 'ESTUDIANTE',
        usuarioId: '77777777',
        horaRegistro: '16:07:00',
        estado: 'PRESENTE',
        comisionId: '6ccdf17f-b8ce-440e-a20a-97e50dbb8e96',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('asistencias', null, {});
  }
};