const { Model, DataTypes } = require('sequelize');

class DiaSinClase extends Model {
  static associate(models) {

    // Tipo de evento
    DiaSinClase.belongsTo(models.TipoEvento, {
      foreignKey: 'tipoEventoId',
      as: 'tipoEvento'
    });

    // Comisión específica (nullable)
    DiaSinClase.belongsTo(models.Comision, {
      foreignKey: 'comisionId',
      as: 'comision'
    });
  }
}

module.exports = (sequelize) => {
  DiaSinClase.init({
    diaSinClaseId: {
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
    },

    // null => afecta a todas las comisiones
    // UUID => afecta solo a esa comisión
    comisionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'comisiones',
        key: 'comisionId'
      }
    }

  }, {
    sequelize,
    modelName: 'DiaSinClase',
    tableName: 'dias_sin_clase',
    timestamps: false
  });

  return DiaSinClase;
};