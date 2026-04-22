const { Model, DataTypes } = require('sequelize');

class Asistencia extends Model {
  static associate(models) {
    // Relación original
    Asistencia.belongsTo(models.Comision, { foreignKey: 'comisionId', as: 'comision' });

    // Nuevas relaciones
    // Usamos belongsTo porque la Asistencia contiene la FK (usuarioId)
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
    asistenciaId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    fecha: { 
      type: DataTypes.DATEONLY, 
      allowNull: false,
      defaultValue: DataTypes.NOW 
    },
    horaRegistro: { 
      type: DataTypes.TIME, 
      defaultValue: DataTypes.NOW 
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
    comisionId: { type: DataTypes.UUID, allowNull: false }
  }, {
    sequelize,
    modelName: 'Asistencia',
    tableName: 'asistencias',
    indexes: [
      { fields: ['fecha', 'comisionId', 'usuarioId'], unique: true }
    ]
  });
  return Asistencia;
};