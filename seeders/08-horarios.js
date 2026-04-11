'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('horarios', [
      {
        horarioId: '66666666-6666-6666-6666-666666666666',
        diaSemana: 'Miercoles',
        horaDesde: '18:00',
        horaHasta: '22:00',
        periodicidad: 'Todas',
        comisionId: '55555555-5555-5555-5555-555555555555',
        aulaId: '22222222-2222-2222-2222-222222222222'
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('horarios', null, {});
  }
};