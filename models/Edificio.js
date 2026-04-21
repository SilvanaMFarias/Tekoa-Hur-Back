const { Model, DataTypes } = require('sequelize');

class Edificio extends Model {
  static associate(models) {
  }
}

module.exports = (sequelize) => {
  Edificio.init({
    edificioId: { 
      type: DataTypes.UUID, 
      defaultValue: DataTypes.UUIDV4, 
      primaryKey: true 
    },
    nombre: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true 
    } // Ej: "JUSTICIA SOCIAL"
  }, {
    sequelize,
    modelName: 'Edificio',
    tableName: 'edificios',
    timestamps: false
  });
  return Edificio;
};