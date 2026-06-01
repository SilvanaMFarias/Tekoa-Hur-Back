// ============================================================
// models/AulaAtributos.js
// ============================================================
// TARJETA R2-01 — Modelo de atributos del aula
//
// Esta tabla guarda los datos descriptivos de cada aula:
// capacidad, tipo, si es laboratorio informático, equipamiento,
// descripción. Es una relación 1:1 con la tabla aulas.
//
// Por qué tabla aparte y no columnas en aulas:
//   - aulas es una entidad nuclear del sistema que conviene mantener
//     liviana. Cargar muchos campos descriptivos la engorda.
//   - Los atributos son OPCIONALES: una aula puede existir sin
//     atributos cargados (un admin puede aún no haber pasado por ahí).
//   - Permite evolucionar los atributos sin tocar la tabla principal
//     (agregar/quitar campos descriptivos no afecta el resto del sistema).
//
// La relación 1:1 se logra usando aulaId como PRIMARY KEY y FOREIGN KEY
// al mismo tiempo. Eso garantiza que nunca puede haber dos filas de
// atributos para la misma aula.
// ============================================================

const { Model, DataTypes } = require("sequelize");

class AulaAtributos extends Model {
  static associate(models) {
    // 1:1 con Aula. La FK está en este lado (aulaId).
    AulaAtributos.belongsTo(models.Aula, {
      foreignKey: "aulaId",
      as: "aula",
    });
  }
}

module.exports = (sequelize) => {
  AulaAtributos.init(
    {
      // aulaId es PK y FK al mismo tiempo: garantiza la relación 1:1
      aulaId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },

      // Capacidad máxima de personas
      capacidad: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
        },
      },

      // Tipo: "aula común", "laboratorio", "salón de actos", etc.
      tipoAula: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      // Marca específica si es lab de informática
      esLaboratorioInformatico: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      // Cantidad de PCs (solo aplica si es lab informático).
      // Normalización defensiva: si esLab=false, este campo debe ser null.
      cantidadPC: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
        },
      },

      // Descripción libre del aula
      descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // Lista de equipamiento como array de strings.
      // ARRAY funciona en Postgres. Si la DB es otra, cambiar a STRING (CSV).
      equipamiento: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: [],
      },
    },
    {
      sequelize,
      modelName: "AulaAtributos",
      tableName: "aula_atributos",
      timestamps: true,
    }
  );

  return AulaAtributos;
};
