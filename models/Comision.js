const { Model, DataTypes } = require('sequelize');

class Comision extends Model {
  static associate(models) {
  Comision.belongsTo(models.Materia, { foreignKey: 'subjectId', as: 'materia' });
  Comision.belongsTo(models.Profesor, { foreignKey: 'professorId', as: 'profesor' });
  Comision.hasMany(models.Horario, { foreignKey: 'comisionId', as: 'horarios' });
  Comision.belongsToMany(models.Estudiante, {
    through: models.Matricula,
    foreignKey: 'comisionId', // Coincidir con Matricula
    as: 'estudiantes'
  });
}
}

module.exports = (sequelize) => {
  Comision.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    code: { type: DataTypes.STRING, allowNull: false }, // Ej: "COMISIÓN_001-TM"
    subjectId: { type: DataTypes.UUID, allowNull: false },
    professorId: { type: DataTypes.UUID, allowNull: false }
  }, {
    sequelize,
    modelName: 'Comision',
    tableName: 'comisiones',
  });
  return Comision;
};