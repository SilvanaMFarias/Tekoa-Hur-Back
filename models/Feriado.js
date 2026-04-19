const { Model, DataTypes } = require('sequelize');

class Feriado extends Model {
  static associate(models) {
    // Si después querés relacionarlo con eventos/clases, va acá
  }
}

module.exports = (sequelize) => {
  Feriado.init({
    feriadoId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    descripcion: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Feriado',
    tableName: 'feriados',
    timestamps: false
  });

  return Feriado;
};