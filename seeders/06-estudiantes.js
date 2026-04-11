'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('estudiantes', [
      { dni: '35678093', nombre_apellido: 'Amarilla, Adriana', createdAt: new Date(), updatedAt: new Date() },
      { dni: '34896098', nombre_apellido: 'Farias, Silvana', createdAt: new Date(), updatedAt: new Date() },
      { dni: '26890654', nombre_apellido: 'Amarillo, Yamil', createdAt: new Date(), updatedAt: new Date() }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('estudiantes', null, {});
  }
};