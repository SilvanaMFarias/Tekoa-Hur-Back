'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('tipo_eventos', [
      { tipoEventoId: Sequelize.literal('gen_random_uuid()'), nombre: 'Cancelación de clase' },
      { tipoEventoId: Sequelize.literal('gen_random_uuid()'), nombre: 'Día no laborable' },
      { tipoEventoId: Sequelize.literal('gen_random_uuid()'), nombre: 'Paro docente' }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('tipo_eventos', null, {});
  }
};