// ============================================================
// models/Aula.js
// ============================================================
// CAMBIO: se agrega rtokenExpira (DATE) para expiración del QR.
// Después de reemplazar este archivo, correr:
//   npx sequelize-cli db:migrate
// O si no usás migrations:
//   cambiar sequelize.sync() por sequelize.sync({ alter: true })
//   UNA sola vez para que agregue la columna.
// ============================================================

const { Model, DataTypes } = require("sequelize");

class Aula extends Model {
  static associate(models) {
    Aula.belongsTo(models.Edificio, { foreignKey: "edificioId", as: "edificio" });
    Aula.hasMany(models.Horario,    { foreignKey: "aulaId",     as: "horarios" });
  }
}

module.exports = (sequelize) => {
  Aula.init({
    aulaId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sector: { type: DataTypes.STRING, allowNull: false },
    numero: { type: DataTypes.STRING, allowNull: false },

    // Campo virtual: no va a la DB, se calcula al leer
    nombreCompleto: {
      type: DataTypes.VIRTUAL,
      get() { return `${this.sector}-${this.numero}`; },
    },

    edificioId: { type: DataTypes.UUID, allowNull: false },

    // Token del QR activo (null = no hay QR generado)
    rtoken: { type: DataTypes.STRING, allowNull: true },

    // ✅ NUEVO: cuándo expira el rtoken
    rtokenExpira: { type: DataTypes.DATE, allowNull: true },

  }, {
    sequelize,
    modelName: "Aula",
    tableName: "aulas",
    timestamps: false,
  });

  return Aula;
};
