// ============================================================
// models/Reserva.js
// ============================================================
// Modelo de Reservas de Aulas
//
// Esta tabla guarda reservas puntuales de aulas para una franja
// horaria específica. Sirve para eventos institucionales,
// reuniones de cátedra, exámenes, charlas, etc.
//
// DIFERENCIA CON HORARIOS:
//   - Horario: recurrente (todos los martes 14-16hs en aula A-101)
//   - Reserva: puntual (el martes 15/julio 14-16hs en aula A-101)
//
// Estados:
//   - confirmada: la reserva está activa y el aula está ocupada
//   - cancelada:  la reserva fue dada de baja (queda como histórico)
//
// La validación de conflictos (que NO se pise con otra reserva
// o con un horario de cursada) está en el SERVICE, no en el modelo.
// ============================================================

const { Model, DataTypes } = require("sequelize");

class Reserva extends Model {
  static associate(models) {
    // ── Una reserva pertenece a UN aula ──────────────
    Reserva.belongsTo(models.Aula, {
      foreignKey: "aulaId",
      as: "aula",
    });

    // ── Una reserva la hizo UN usuario (admin) ───────
    // Sirve para auditoría: saber quién la creó y para
    // que solo el creador (o admin) pueda cancelarla.
    Reserva.belongsTo(models.Usuario, {
      foreignKey: "usuarioId",
      as: "usuario",
    });
  }
}

module.exports = (sequelize) => {
  Reserva.init(
    {
      reservaId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      // FK al aula reservada (obligatoria)
      aulaId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      // FK al usuario que hizo la reserva (obligatoria)
      usuarioId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      // Motivo corto y obligatorio. Aparece en listados y calendario.
      // Ej: "Reunión de cátedra", "Charla de Java", "Examen final".
      motivo: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
          notEmpty: { msg: "El motivo no puede estar vacío" },
          len: {
            args: [3, 200],
            msg: "El motivo debe tener entre 3 y 200 caracteres",
          },
        },
      },

      // Cuándo arranca la reserva (fecha + hora)
      fechaInicio: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      // Cuándo termina la reserva (fecha + hora)
      fechaFin: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      // Estado actual: confirmada o cancelada
      // ENUM en lugar de STRING para garantizar valores válidos
      // a nivel base de datos.
      estado: {
        type: DataTypes.ENUM("confirmada", "cancelada"),
        allowNull: false,
        defaultValue: "confirmada",
      },

      // Detalle opcional largo (qué se hace, quién participa, etc.)
      descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Reserva",
      tableName: "reservas",
      timestamps: true, // createdAt y updatedAt automáticos

      // ── VALIDACIÓN A NIVEL MODELO ──────────────────
      // Se ejecuta antes de cada save/create. Si tira error,
      // Sequelize aborta la operación.
      //
      // Garantiza que fechaInicio < fechaFin SIEMPRE,
      // incluso si alguien intenta crear desde la consola
      // o un test mal escrito.
      validate: {
        fechasCoherentes() {
          if (this.fechaInicio && this.fechaFin) {
            if (new Date(this.fechaInicio) >= new Date(this.fechaFin)) {
              throw new Error("fechaInicio debe ser anterior a fechaFin");
            }
          }
        },
      },

      // ── ÍNDICES ─────────────────────────────────────
      // Tres índices para acelerar las queries más frecuentes
      // del service de reservas.
      indexes: [
        // Buscar todas las reservas de un aula
        { fields: ["aulaId"] },
        // Filtrar por estado (mayoría de queries piden 'confirmada')
        { fields: ["estado"] },
        // Compuesto: buscar reservas de un aula en un rango de fechas.
        // Es el índice CLAVE para la detección de conflictos.
        { fields: ["aulaId", "fechaInicio", "fechaFin"] },
      ],
    }
  );

  return Reserva;
};
