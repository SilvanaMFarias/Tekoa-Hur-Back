// ============================================================
// models/Aula.js
// ============================================================//
// Cambios desde:
//   - Asociación con AulaAtributos: activa
//   - Asociación con EspacioQR: activa
//
// Campos rtoken y rtokenExpira siguen DEPRECATED.
// ============================================================

const { Model, DataTypes } = require("sequelize");

class Aula extends Model {
  static associate(models) {
    Aula.belongsTo(models.Edificio, {
      foreignKey: "edificioId",
      as: "edificio",
    });
    Aula.hasMany(models.Horario, {
      foreignKey: "aulaId",
      as: "horarios",
    });

    // ─── ATRIBUTOS DEL AULA (relación 1:1) ───────────
    Aula.hasOne(models.AulaAtributos, {
      foreignKey: "aulaId",
      as: "atributos",
    });

    // ───QR DE ESPACIO (relación 1:N) ────────────────
    // Un aula puede tener varios QRs históricos pero solo uno
    // activo a la vez (garantizado por índice parcial único
    // en el modelo EspacioQR).
    Aula.hasMany(models.EspacioQR, {
      foreignKey: "aulaId",
      as: "espacioQRs",
    });
  }
}

module.exports = (sequelize) => {
  Aula.init(
    {
      aulaId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      sector: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      numero: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      nombreCompleto: {
        type: DataTypes.VIRTUAL,
        get() {
          return `${this.sector}-${this.numero}`;
        },
      },

      edificioId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      // ─── DEPRECATED ─────────────────────────────
      rtoken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      rtokenExpira: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Aula",
      tableName: "aulas",
      timestamps: false,
    }
  );

  return Aula;
};
