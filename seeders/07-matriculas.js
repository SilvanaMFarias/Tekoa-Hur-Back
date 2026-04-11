'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('matriculas', [
      {
        matriculaId: uuidv4(),
        estudianteDni: '35678093',
        comisionId: '55555555-5555-5555-5555-555555555555',
        fechaInscripcion: new Date()
      },
      {
        matriculaId: uuidv4(),
        estudianteDni: '34896098',
        comisionId: '55555555-5555-5555-5555-555555555555',
        fechaInscripcion: new Date()
      },
      {
        matriculaId: uuidv4(),
        estudianteDni: '26890654',
        comisionId: '55555555-5555-5555-5555-555555555555',
        fechaInscripcion: new Date()
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('matriculas', null, {});
  }
};