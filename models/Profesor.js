const { Model, DataTypes } = require('sequelize');

class Profesor extends Model {
  static associate(models) {
    Profesor.hasMany(models.Comision, {// Un profesor puede tener a cargo muchas comisiones
      foreignKey: 'profesorId', 
      as: 'comisiones' 
    });
  }
}

module.exports = (sequelize) => {
  Profesor.init({
    profesorId: { 
      type: DataTypes.UUID, 
      defaultValue: DataTypes.UUIDV4, 
      primaryKey: true 
    },
    /*
    dni: { 
      type: DataTypes.STRING, 
      primaryKey: true, 
      allowNull: false 
    },
    */
    dni: { 
      type: DataTypes.STRING, 
      allowNull: false,
      unique: true   // ✅ índice único en vez de PK
    },
    nombre_apellido: { 
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