const { Model, DataTypes } = require('sequelize');

class TipoEvento extends Model {
  static associate(models) {
    // Para futuras relaciones (ej: eventos de clase)
  }
}

module.exports = (sequelize) => {
  TipoEvento.init({
    tipoEventoId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'TipoEvento',
    tableName: 'tipo_eventos',
    timestamps: false
  });

  return TipoEvento;
};