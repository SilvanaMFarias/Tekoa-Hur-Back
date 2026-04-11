const { Model, DataTypes } = require('sequelize');

class Horario extends Model {
  static associate(models) {
    // Un horario pertenece a una comisión específica
    Horario.belongsTo(models.Comision, { foreignKey: 'comisionId', as: 'comision' });
    // Relación con Aula para saber dónde es la clase
    Horario.belongsTo(models.Aula, { foreignKey: 'aulaId', as: 'aula' });
  }
}

module.exports = (sequelize) => {
  Horario.init({
    horarioId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    diaSemana: { 
      type: DataTypes.STRING, 
      allowNull: false // Ej: "Lunes", "Martes"
    },
    horaDesde: { 
      type: DataTypes.TIME, 
      allowNull: false // Ej: "08:00"
    },
    horaHasta: { 
      type: DataTypes.TIME, 
      allowNull: false // Ej: "12:00"
    },
    periodicidad: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "Todas", // Para casos como "Semanas 1-3-5" del CSV
    },
    comisionId: { type: DataTypes.UUID, allowNull: false },
    aulaId: { type: DataTypes.UUID, allowNull: false }
  }, {
    sequelize,
    modelName: 'Horario',
    tableName: 'horarios',
    timestamps: false
  });
  return Horario;
};