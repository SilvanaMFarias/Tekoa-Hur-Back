const { Model, DataTypes } = require('sequelize');

class Qr extends Model {
  static associate(models) {
    Qr.belongsTo(models.Aula, { foreignKey: 'aulaId', as: 'aula' });
  }
}

module.exports = (sequelize) => {
  Qr.init({
    qrid: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      field: "qrid"
    },
    edificioId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "edificioid"
    },
    aulaId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "aulaid"
    },
    fecha_inicio: {
      type: DataTypes.DATE,
      allowNull: false
    },
    fecha_fin: {
      type: DataTypes.DATE,
      allowNull: false
    },
    rtoken: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    }
  }, {
    sequelize,
    modelName: 'Qr',
    tableName: 'qr',
    timestamps: false
  });

  return Qr;
};