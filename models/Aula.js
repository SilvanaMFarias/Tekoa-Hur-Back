const { Model, DataTypes } = require('sequelize');

class Aula extends Model {
  static associate(models) {
    // Relación con Edificio
    Aula.belongsTo(models.Edificio, { foreignKey: 'edificioId', as: 'edificio' });
    // Relación con Horarios o Comisiones
    Aula.hasMany(models.Horario, { foreignKey: 'aulaId', as: 'horarios' });
  }
}

module.exports = (sequelize) => {
  Aula.init({
    aulaId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    sector: { 
      type: DataTypes.STRING, 
      allowNull: false // Ej: "JS"
    },
    numero: { 
      type: DataTypes.STRING, 
      allowNull: false // Ej: "004"
    },
    nombreCompleto: {
      type: DataTypes.VIRTUAL,
      get() {
        return `${this.sector}-${this.numero}`;
      }
    },
    edificioId: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Aula',
    tableName: 'aulas',
    timestamps: false
  });
  return Aula;
};