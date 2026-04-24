const { Model, DataTypes } = require('sequelize');

class Aula extends Model {
  static associate(models) {
    Aula.belongsTo(models.Edificio, { foreignKey: 'edificioId', as: 'edificio' });
    Aula.hasMany(models.Horario, { foreignKey: 'aulaId', as: 'horarios' });
  }
}

module.exports = (sequelize) => {
  Aula.init({
    aulaId: { 
      type: DataTypes.UUID, 
      defaultValue: DataTypes.UUIDV4, 
      primaryKey: true 
    },

    sector: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },

    numero: { 
      type: DataTypes.STRING, 
      allowNull: false 
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
    },

    rtoken: {
      type: DataTypes.STRING,
      allowNull: true
    }

  }, {
    sequelize,
    modelName: 'Aula',
    tableName: 'aulas',
    timestamps: false
  });

  return Aula;
};