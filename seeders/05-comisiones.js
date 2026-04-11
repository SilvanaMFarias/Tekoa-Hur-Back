'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('comisiones', [
      {
        comisionId: '55555555-5555-5555-5555-555555555555',
        cod_comision: 'COMISIÓN_001-TM',
        materiaId: '33333333-3333-3333-3333-333333333333',
        profesorId: '44444444-4444-4444-4444-444444444444',
        createdAt: new Date(),  
        updatedAt: new Date()  
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('comisiones', null, {});
  }
};