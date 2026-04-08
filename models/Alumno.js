const { Model, DataTypes } = require('sequelize');

class Estudiante extends Model {
  static associate(models) {
    Estudiante.belongsToMany(models.Seccion, {
      through: models.Matricula,
      foreignKey: 'estudianteDni',
      as: 'secciones'
    });
  }
}

module.exports = (sequelize) => {
  Estudiante.init({
    dni: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
    fullName: { type: DataTypes.STRING, allowNull: false },
  }, {
    sequelize,
    modelName: 'Estudiante',
    tableName: 'estudiantes',
  });
  return Estudiante;
};