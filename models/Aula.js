const { Model, DataTypes } = require('sequelize');

class Classroom extends Model {
  static associate(models) {
    Classroom.belongsTo(models.Building, { foreignKey: 'buildingId', as: 'building' });
    Classroom.hasMany(models.Schedule, { foreignKey: 'classroomId', as: 'schedules' });
  }
}

module.exports = (sequelize) => {
  Classroom.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false }, // Ej: "JS-004"
    coordinates: { type: DataTypes.JSONB, allowNull: true }, // Ideal en PostgreSQL para mapeo en el frontend
    buildingId: { type: DataTypes.UUID, allowNull: false }
  }, {
    sequelize,
    modelName: 'Classroom',
    tableName: 'classrooms',
    timestamps: false
  });
  return Classroom;
};