// ============================================================
// models/Aula.js
// ============================================================
// Estado actual: tarjeta R2-01 (atributos del aula)
//
// Cambios desde R1:
//   - Se descomenta la asociación con AulaAtributos (1:1).
//   - La asociación con EspacioQR sigue COMENTADA porque ese
//     modelo se crea en R2-02. Si lo descomentás antes de crear
//     EspacioQR.js, Sequelize crashea al arrancar el servidor.
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

    // ─── R2-02 PENDIENTE: QR DE ESPACIO ─────────────────────
    // No descomentar hasta crear models/EspacioQR.js
    //
    // Aula.hasMany(models.EspacioQR, {
    //   foreignKey: "aulaId",
    //   as: "espacioQRs",
    // });
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
