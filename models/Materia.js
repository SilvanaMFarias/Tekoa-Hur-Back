const { Model, DataTypes } = require('sequelize');

class Materia extends Model {
  static associate(models) {
    // Una materia puede tener muchas comisiones (ej: Mañana, Tarde, Noche)
    Materia.hasMany(models.Comision, { 
      foreignKey: 'subjectId', 
      as: 'comisiones' 
    });
  }
}

module.exports = (sequelize) => {
  Materia.init({
    id: { 
      type: DataTypes.UUID, 
      defaultValue: DataTypes.UUIDV4, 
      primaryKey: true 
    },
    nombre: { 
      type: DataTypes.STRING, 
      allowNull: false,
      unique: true // Evita tener dos materias con el mismo nombre
    }
  }, {
    sequelize,
    modelName: 'Materia',
    tableName: 'materias',
    timestamps: false
  });
  return Materia;
};