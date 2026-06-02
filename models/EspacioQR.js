// ============================================================
// models/EspacioQR.js
// ============================================================
// QR permanente del espacio (aula)
//
// Este es el SEGUNDO tipo de QR del sistema:
//
//   QR DE ASISTENCIA             QR DE ESPACIO
//   ────────────────────────     ──────────────────────────
//   Vive en Comision             Vive en EspacioQR (esta tabla)
//   Lo genera el docente         Lo genera el admin
//   Expira en minutos            No expira (es permanente)
//   Se rota cada vez             Se da de baja explícitamente
//   Sirve para registrar         Sirve para mostrar info del aula
//
// DECISIÓN CLAVE: índice parcial único.
//
// Cada aula puede tener UN solo QR activo. Los QRs anteriores
// quedan inactivos como histórico (no se borran, para auditoría).
//
// Esta regla la garantiza la base de datos a través de un
// índice parcial:
//
//   CREATE UNIQUE INDEX espacio_qr_aula_activo_unico
//     ON espacio_qr (aulaId)
//     WHERE activo = true;
//
// El "WHERE activo = true" hace que la unicidad solo aplique a
// los registros activos. Permite que haya múltiples inactivos
// pero solo UNO activo por aula. Es una feature específica de
// Postgres llamada "partial index".
// ============================================================

const crypto = require("crypto");
const { Model, DataTypes } = require("sequelize");

class EspacioQR extends Model {
  static associate(models) {
    EspacioQR.belongsTo(models.Aula, {
      foreignKey: "aulaId",
      as: "aula",
    });
    EspacioQR.belongsTo(models.Edificio, {
      foreignKey: "edificioId",
      as: "edificio",
    });
  }

  static generarToken() {
    return crypto.randomBytes(32).toString("hex");
  }
}

module.exports = (sequelize) => {
  EspacioQR.init(
    {
      espacioQrId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      token: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },

      // FK al aula que identifica este QR
      aulaId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      // FK al edificio (redundante pero útil para queries directas)
      edificioId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      // Solo UN QR activo por aula a la vez (ver índice parcial abajo)
      activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      // Quién lo generó (auditoría)
      generadoPor: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      // Cuándo se desactivó (null si sigue activo)
      desactivadoEn: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "EspacioQR",
      tableName: "espacio_qr",
      timestamps: true,
      indexes: [
        // Índice parcial único: solo UN QR activo por aula.
        // Sequelize lo traduce a Postgres usando la clausula "where".
        {
          name: "espacio_qr_aula_activo_unico",
          unique: true,
          fields: ["aulaId"],
          where: {
            activo: true,
          },
        },
      ],
    }
  );

  return EspacioQR;
};
