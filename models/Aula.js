// ============================================================
// models/Aula.js
// ============================================================
// CAMBIOS:
//  1. Se agregan asociaciones con AulaAtributos (1:1) y EspacioQR
//     (1:N, aunque en la práctica solo 1 esté activo a la vez).
//  2. Los campos rtoken y rtokenExpira quedan como DEPRECATED
//     (ya no se usan para nada): el QR de asistencia ahora vive en
//     Comision. Los dejamos para no perder datos viejos durante la
//     migración. Se pueden eliminar en una futura migración cuando
//     el sistema esté estable.
//
// Recordar correr la migración para crear las tablas nuevas:
//   npx sequelize-cli db:migrate
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

    // ─── NUEVAS ASOCIACIONES ────────────────────────────────
    // 1:1 con AulaAtributos. hasOne porque el aula es "padre"
    // de su fila de atributos (la PK de la otra tabla es aulaId).
    Aula.hasOne(models.AulaAtributos, {
      foreignKey: "aulaId",
      as: "atributos",
    });

    // 1:N con EspacioQR. Una aula puede tener histórico de QRs
    // (algunos desactivados), pero a nivel de negocio solo uno
    // activo a la vez (lo garantiza el índice parcial en EspacioQR).
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

      // Campo virtual: no va a la DB, se calcula al leer
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

      // ─── DEPRECATED: ya no se usa ───────────────────────────
      // El QR de asistencia se movió a Comision.qrToken porque
      // ahora identifica la materia+comisión, no el aula.
      // Se mantienen estas columnas SOLO por compatibilidad con
      // datos viejos. Se podrán remover en una migración futura.
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
