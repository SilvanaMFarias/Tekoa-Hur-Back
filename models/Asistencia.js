const { Model, DataTypes } = require('sequelize');

class Asistencia extends Model {
  static associate(models) {
    // La asistencia se registra sobre una comisión en un día dado
    Asistencia.belongsTo(models.Comision, { foreignKey: 'comisionId', as: 'comision' });
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
    // ID o DNI de quien marca la asistencia
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
    // Índices para que el buscador de asistencia sea rápido
    indexes: [
      { fields: ['fecha', 'comisionId', 'usuarioId'], unique: true }
    ]
  });
  return Asistencia;
};