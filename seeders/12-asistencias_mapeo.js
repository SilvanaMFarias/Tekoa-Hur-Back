'use strict';

const { v4: uuidv4 } = require('uuid');
const XLSX = require('xlsx');

module.exports = {
  async up(queryInterface) {

    const workbook = XLSX.readFile('seeders/data/PRUEBA2.xlsx');
    const sheet = workbook.Sheets['Hoja1'];
    const data = XLSX.utils.sheet_to_json(sheet);

    const comisionesMap = {
      'COMISIÓN_001-TM': 'bd130da7-1391-47f9-8a73-47aef4227365',
      'COMISIÓN_002-TM': '6fe3ef02-ea64-46f9-9fd7-acc5a866630c',
      'COMISIÓN_003-TM': '32267952-f0c0-4cfa-ad56-c357e83bbd4c',
      'COMISIÓN_004-TM': 'c789677c-51d5-4656-a407-25f73ac14567',
      'COMISIÓN_005-TM': 'ff322238-8a2e-4531-8ef2-03d37405b39c',
      'COMISIÓN_006-TM': 'bac3b746-5954-4d9e-8546-f5835933d08c',
      'COMISIÓN_007-TM': 'dcb12087-501d-4273-86d9-578cc0d5c43f',
      'COMISIÓN_008-TM': '445dd361-333d-46ce-a260-331355f315fe',
      'COMISIÓN_009-TM': 'f9d92dce-f38e-424a-bd35-c773fb74d8b5'
    };

    const asistencias = [];

    for (const row of data) {

      const dni = row.DNI;
      const comision = row['COMISIÓN'];

      if (!dni || !comision) continue;

      const comisionId = comisionesMap[comision];
      if (!comisionId) continue;

      asistencias.push({
        asistenciaId: uuidv4(),
        fecha: '2026-04-01',
        horaRegistro: '08:00:00',
        tipoUsuario: 'ESTUDIANTE',
        usuarioId: String(dni),
        estado: 'PRESENTE',
        comisionId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // 🔥 evitar duplicados por índice único
    const unique = [];
    const seen = new Set();

    for (const a of asistencias) {
      const key = `${a.usuarioId}-${a.comisionId}-${a.fecha}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(a);
      }
    }

    await queryInterface.bulkInsert('asistencias', unique);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('asistencias', null, {});
  }
};