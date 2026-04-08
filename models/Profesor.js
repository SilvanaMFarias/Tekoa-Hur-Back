const { Model, DataTypes } = require('sequelize');

class Profesor extends Model {
  static associate(models) {
    Profesor.hasMany(models.Seccion, {// Un profesor puede tener a cargo muchas comisiones
      foreignKey: 'professorId', 
      as: 'sections' 
    });
  }
}

module.exports = (sequelize) => {
  Profesor.init({
    id: { 
      type: DataTypes.UUID, 
      defaultValue: DataTypes.UUIDV4, 
      primaryKey: true 
    },
    fullName: { 
      type: DataTypes.STRING, 
      allowNull: false,
      unique: true 
    },
    email: { 
      type: DataTypes.STRING, 
      allowNull: true,
      validate: { isEmail: true }
    },
  }, {
    sequelize,
    modelName: 'Profesor',
    tableName: 'profesores',
    timestamps: true
  });
  return Profesor;
};