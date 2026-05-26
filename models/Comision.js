// ============================================================
// models/Comision.js
// ============================================================
// CAMBIO IMPORTANTE: el QR de asistencia ahora vive en la comisión,
// no en el aula.
//
// ¿Por qué? El QR identifica una clase concreta (materia + grupo de
// alumnos + docente). El aula es solo el lugar físico donde sucede
// y puede cambiar día a día por reubicaciones. Si el QR estuviera
// en el aula y la clase se mueve de aula, el docente perdería el QR
// generado o tendría que regenerarlo. Atándolo a la comisión, el QR
// sigue siendo válido independientemente del aula.
//
// Para que no se rompa el sistema actual, se mantiene Aula.rtoken
// como deprecated (ver models/Aula.js).
// ============================================================

const { Model, DataTypes } = require("sequelize");

class Comision extends Model {
  static associate(models) {
  Comision.belongsToMany(models.Estudiante, {
    through: models.Matricula,
    foreignKey: 'comisionId', // Coincidir con Matricula
    as: 'estudiantes'
  });
  Comision.hasMany(models.DiaSinClase, {
  foreignKey: 'comisionId',
  as: 'diasSinClase'
  });
    Comision.belongsTo(models.Materia, {
      foreignKey: "materiaId",
      as: "materia",
    });
    Comision.belongsTo(models.Profesor, {
      foreignKey: "profesorId",
      as: "profesor",
    });
    Comision.hasMany(models.Horario, {
      foreignKey: "comisionId",
      as: "horarios",
    });
  }
}

module.exports = (sequelize) => {
  Comision.init(
    {
      comisionId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      cod_comision: {
        type: DataTypes.STRING,
        allowNull: false,
      }, // Ej: "COMISIÓN_001-TM"
      materiaId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      profesorId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      // ─── NUEVOS CAMPOS PARA EL QR DE ASISTENCIA ─────────────
      // Token único del QR vigente. Null cuando no hay QR activo.
      // String porque guardamos hex de 32 bytes (64 chars).
      qrToken: {
        type: DataTypes.STRING(64),
        allowNull: true,
        unique: true, // dos comisiones nunca comparten token
      },

      // Cuándo expira el QR. Se calcula al generar como
      //   ahora + duración (default 120 min, configurable por docente).
      // Una vez vencido, el endpoint /validar lo limpia.
      qrTokenExpira: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Comision",
      tableName: "comisiones",
    }
  );

  return Comision;
};
