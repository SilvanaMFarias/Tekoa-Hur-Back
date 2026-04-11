'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('edificios', [
      {
        edificioId: '11111111-1111-1111-1111-111111111111',
        nombre: 'JUSTICIA SOCIAL'
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('edificios', null, {});
  }
};