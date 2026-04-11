'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('materias', [
      {
        materiaId: '33333333-3333-3333-3333-333333333333',
        nombre: 'PROYECTO'
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('materias', null, {});
  }
};