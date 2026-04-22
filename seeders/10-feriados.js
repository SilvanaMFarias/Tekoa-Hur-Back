'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('feriados', [
      { feriadoId: Sequelize.literal('gen_random_uuid()'), fecha: '2026-12-25', descripcion: 'Navidad' },
      { feriadoId: Sequelize.literal('gen_random_uuid()'), fecha: '2026-12-08', descripcion: 'Inmaculada Concepción de María' },
      { feriadoId: Sequelize.literal('gen_random_uuid()'), fecha: '2026-12-07', descripcion: 'Día no laborable con fines turísticos' },
      { feriadoId: Sequelize.literal('gen_random_uuid()'), fecha: '2026-11-23', descripcion: 'Día de la Soberanía Nacional' },
      { feriadoId: Sequelize.literal('gen_random_uuid()'), fecha: '2026-10-12', descripcion: 'Día de la diversidad cultural' },
      { feriadoId: Sequelize.literal('gen_random_uuid()'), fecha: '2026-08-17', descripcion: 'Paso a la Inmortalidad del Gral. José de San Martín' },
      { feriadoId: Sequelize.literal('gen_random_uuid()'), fecha: '2026-07-10', descripcion: 'Día no laborable con fines turísticos' },
      { feriadoId: Sequelize.literal('gen_random_uuid()'), fecha: '2026-07-09', descripcion: 'Día de la Independencia' },
      { feriadoId: Sequelize.literal('gen_random_uuid()'), fecha: '2026-06-20', descripcion: 'Paso a la Inmortalidad del Gral. Manuel Belgrano' },
      { feriadoId: Sequelize.literal('gen_random_uuid()'), fecha: '2026-06-15', descripcion: 'Paso a la Inmortalidad del Gral. Martín Miguel de Güemes' },
      { feriadoId: Sequelize.literal('gen_random_uuid()'), fecha: '2026-05-25', descripcion: 'Día de la Revolución de Mayo' },
      { feriadoId: Sequelize.literal('gen_random_uuid()'), fecha: '2026-05-01', descripcion: 'Día del trabajador' },
      { feriadoId: Sequelize.literal('gen_random_uuid()'), fecha: '2026-04-03', descripcion: 'Viernes Santo' },
      { feriadoId: Sequelize.literal('gen_random_uuid()'), fecha: '2026-04-02', descripcion: 'Malvinas / Jueves Santo' },
      { feriadoId: Sequelize.literal('gen_random_uuid()'), fecha: '2026-03-24', descripcion: 'Memoria por la Verdad y la Justicia' },
      { feriadoId: Sequelize.literal('gen_random_uuid()'), fecha: '2026-03-23', descripcion: 'Día no laborable con fines turísticos' },
      { feriadoId: Sequelize.literal('gen_random_uuid()'), fecha: '2026-02-17', descripcion: 'Carnaval' },
      { feriadoId: Sequelize.literal('gen_random_uuid()'), fecha: '2026-02-16', descripcion: 'Carnaval' },
      { feriadoId: Sequelize.literal('gen_random_uuid()'), fecha: '2026-01-01', descripcion: 'Año Nuevo' }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('feriados', null, {});
  }
};