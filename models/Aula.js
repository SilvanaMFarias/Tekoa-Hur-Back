// ============================================================
// models/Aula.js
// ============================================================
// Estado actual: tarjeta R1-01 (solo cambios de Comision).
//
// En esta tarjeta los únicos cambios sobre Aula son:
//   - Marcar rtoken y rtokenExpira como DEPRECATED (siguen
//     existiendo, pero ya no se usan para el QR de asistencia).
//
// Las asociaciones con AulaAtributos y EspacioQR vienen DESPUÉS,
// en las tarjetas R2-01 y R2-02. NO se agregan acá todavía
// porque esos modelos no existen aún y Sequelize crashearía al
// intentar resolverlos al cargar.
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

    // ─── ASOCIACIONES PENDIENTES (R2-01 y R2-02) ────────────
    // No descomentar hasta que existan los modelos correspondientes.
    //
    // Aula.hasOne(models.AulaAtributos, {
    //   foreignKey: "aulaId",
    //   as: "atributos",
    // });
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

      // Campo virtual: no va a la DB, se calcula al leer.
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
      // El QR de asistencia se movió a Comision.qrToken porque
      // ahora identifica la materia + comisión, no el aula.
      //
      // Estas dos columnas se mantienen SOLO por compatibilidad
      // con datos viejos y QR físicos ya impresos en el formato
      // anterior. El endpoint /api/qr/registrar legacy los sigue
      // usando.
      //
      // Se podrán remover en una migración futura cuando el
      // parque de QR del campus esté completamente migrado.
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
