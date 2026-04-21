'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.describeTable('tipo_eventos')
      .then(() => true)
      .catch(() => false);

    if (!tableExists) {
      await queryInterface.createTable('tipo_eventos', {
        tipoEventoId: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true
        },
        nombre: {
          type: Sequelize.STRING,
          allowNull: false
        }
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tipo_eventos');
  }
};