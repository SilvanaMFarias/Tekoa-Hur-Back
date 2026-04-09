const { Model, DataTypes } = require('sequelize');

class Matricula extends Model {}

module.exports = (sequelize) => {
  Matricula.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    // Usamos el DNI como referencia al Estudiante
    estudianteDni: { 
      type: DataTypes.STRING, 
      allowNull: false,
      references: { model: 'estudiantes', key: 'dni' }
    },
    comisionId: { 
      type: DataTypes.UUID, 
      allowNull: false,
      references: { model: 'comisiones', key: 'id' }
    },
    fechaInscripcion: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Matricula',
    tableName: 'matriculas',
    timestamps: false
  });
  return Matricula;
};