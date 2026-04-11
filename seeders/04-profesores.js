'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('profesores', [
      {
        profesorId: '44444444-4444-4444-4444-444444444444',
        nombre_apellido: 'TOMÁS MIRANDA',
        email: 'miranda@test.com',
        dni: '35000656',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('profesores', null, {});
  }
};