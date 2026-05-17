const { Model, DataTypes } = require('sequelize');

class Feriado extends Model {
  static associate(models) {
    // Si después querés relacionarlo con eventos/clases, va acá
    //Se asocia los tipos de eventos a los feriados
    Feriado.belongsTo(models.TipoEvento, {
      foreignKey: 'tipoEventoId',
      as: 'tipoEvento'
    });
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
    },
    tipoEventoId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'tipo_eventos',
        key: 'tipoEventoId'
      }
  }
  }, {
    sequelize,
    modelName: 'Feriado',
    tableName: 'feriados',
    timestamps: false
  });

  return Feriado;
};