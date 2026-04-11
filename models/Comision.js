const { Model, DataTypes } = require('sequelize');

class Comision extends Model {
  static associate(models) {
  Comision.belongsTo(models.Materia, { foreignKey: 'materiaId', as: 'materia' });
  Comision.belongsTo(models.Profesor, { foreignKey: 'profesorId', as: 'profesor' });
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
    comisionId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    cod_comision: { type: DataTypes.STRING, allowNull: false }, // Ej: "COMISIÓN_001-TM"
    materiaId: { type: DataTypes.UUID, allowNull: false },
    profesorId: { type: DataTypes.UUID, allowNull: false }
  }, {
    sequelize,
    modelName: 'Comision',
    tableName: 'comisiones',
  });
  return Comision;
};