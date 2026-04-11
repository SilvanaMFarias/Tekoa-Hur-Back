'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('asistencias', [
      {
        asistenciaId: uuidv4(),
        fecha: new Date(),
        tipoUsuario: 'ESTUDIANTE',
        usuarioId: '35678093',
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