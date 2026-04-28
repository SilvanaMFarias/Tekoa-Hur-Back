const { Model, DataTypes } = require('sequelize');

class Asistencia extends Model {
  static associate(models) {
    Asistencia.belongsTo(models.Comision, {
      foreignKey: 'comisionId',
      as: 'comision'
    });

    Asistencia.belongsTo(models.Matricula, {
      foreignKey: 'usuarioId',
      targetKey: 'estudianteDni',
      constraints: false,
      as: 'detalleMatricula'
    });

    Asistencia.belongsTo(models.Profesor, {
      foreignKey: 'usuarioId',
      targetKey: 'dni',
      constraints: false,
      as: 'detalleProfesor'
    });
  }
}

module.exports = (sequelize) => {
  Asistencia.init({
    asistenciaId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    // 🔥 FIX: sin NOW para evitar conversiones UTC implícitas
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },

    // 🔥 FIX: TIME sin NOW (lo manejás en el controller)
    horaRegistro: {
      type: DataTypes.TIME,
      allowNull: false
    },

    tipoUsuario: {
      type: DataTypes.ENUM('ESTUDIANTE', 'PROFESOR'),
      allowNull: false
    },

    usuarioId: {
      type: DataTypes.STRING,
      allowNull: false
    },

    estado: {
      type: DataTypes.ENUM('PRESENTE', 'AUSENTE', 'TARDE', 'JUSTIFICADO'),
      defaultValue: 'PRESENTE'
    },

    comisionId: {
      type: DataTypes.UUID,
      allowNull: false
    }

  }, {
    sequelize,
    modelName: 'Asistencia',
    tableName: 'asistencias',

    indexes: [
      {
        fields: ['fecha', 'comisionId', 'usuarioId'],
        unique: true
      }
    ]
  });

  return Asistencia;
};