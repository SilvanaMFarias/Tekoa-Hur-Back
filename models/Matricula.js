const { Model, DataTypes } = require('sequelize');

class Matricula extends Model {
  static associate(models) {
    Matricula.belongsTo(models.Estudiante, {
      foreignKey: 'estudianteDni',
      targetKey: 'dni',
      as: 'estudiante',
    });
    Matricula.belongsTo(models.Comision, {
      foreignKey: 'comisionId',
      as: 'comision',
    });
  }
}

module.exports = (sequelize) => {
  Matricula.init({
    matriculaId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // Usamos el DNI como referencia al Estudiante
    estudianteDni: {
      type: DataTypes.STRING,
      allowNull: false,
      references: { model: 'estudiantes', key: 'dni' },
    },
    comisionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'comisiones', key: 'id' },
    },
    fechaInscripcion: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW,
    },
    // ─── NUEVOS CAMPOS PARA SOFT DELETE ───────────────
    // estado: "activa" → la matrícula está vigente.
    // estado: "baja"   → soft delete: la matrícula ya no se considera
    //                     activa pero queda registro en la BD.
    estado: {
      type: DataTypes.ENUM('activa', 'baja'),
      allowNull: false,
      defaultValue: 'activa',
    },
    // Fecha en que se dio de baja. Null si la matrícula está activa.
    fechaBaja: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Matricula',
    tableName: 'matriculas',
    timestamps: false,
  });
  return Matricula;
};
