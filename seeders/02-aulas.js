'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('aulas', [
      {
        aulaId: '22222222-2222-2222-2222-222222222222',
        sector: 'JS',
        numero: '004',
        edificioId: '11111111-1111-1111-1111-111111111111'
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('aulas', null, {});
  }
};