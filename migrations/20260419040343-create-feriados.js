'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.describeTable('feriados')
      .then(() => true)
      .catch(() => false);

    if (!tableExists) {
      await queryInterface.createTable('feriados', {
        feriadoId: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true
        },
        fecha: {
          type: Sequelize.DATEONLY,
          allowNull: false
        },
        descripcion: {
          type: Sequelize.STRING,
          allowNull: false
        }
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('feriados');
  }
};