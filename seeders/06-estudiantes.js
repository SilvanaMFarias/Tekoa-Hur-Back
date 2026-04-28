'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('estudiantes', [
      { dni: '25657470', nombre_apellido: 'ABADIE, LUANA NEREA', createdAt: new Date(), updatedAt: new Date() },
      { dni: '38870541', nombre_apellido: 'ABALLAY GOMEZ, AGUSTIN NICOLAS', createdAt: new Date(), updatedAt: new Date() },
      { dni: '45204013', nombre_apellido: 'ABALLAY, EMANUEL', createdAt: new Date(), updatedAt: new Date() },
      { dni: '47517641', nombre_apellido: 'ABALLAY, Nadia', createdAt: new Date(), updatedAt: new Date() }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('estudiantes', null, {});
  }
};