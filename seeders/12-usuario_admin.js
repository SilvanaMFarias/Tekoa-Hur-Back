'use strict';

const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const SALT = 10;

module.exports = {
  async up(queryInterface, Sequelize) {

    const passwordHash = await bcrypt.hash('admin123', SALT);

    const [usuario] = await queryInterface.sequelize.query(
      `SELECT * FROM usuarios WHERE dni = '00000001'`
    );

    if (usuario.length === 0) {
      await queryInterface.bulkInsert('usuarios', [
        {
          usuarioId: randomUUID(),
          dni: '00000001',
          nombre: 'Administrador Sistema',
          password: passwordHash,
          rol: 'administrador',
          referenciaId: null,
          activo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('usuarios', {
      dni: '00000001',
    });
  },
};