// ============================================================
// models/Aula.js
// ============================================================
// Estado actual: tarjetas R2-01 y R2-02 completadas.
//
// Cambios desde R1:
//   - Asociación con AulaAtributos (R2-01): activa
//   - Asociación con EspacioQR (R2-02): activa
//
// Campos rtoken y rtokenExpira siguen DEPRECATED desde R1-01.
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

    // ─── R2-01: ATRIBUTOS DEL AULA (relación 1:1) ───────────
    Aula.hasOne(models.AulaAtributos, {
      foreignKey: "aulaId",
      as: "atributos",
    });

    // ─── R2-02: QR DE ESPACIO (relación 1:N) ────────────────
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

      // ─── DEPRECATED desde R1-01 ─────────────────────────────
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
