const { Model, DataTypes } = require("sequelize");

class Usuario extends Model {
  static associate(models) {
    // 🔗 con Estudiante
    Usuario.belongsTo(models.Estudiante, {
      foreignKey: "estudianteId",
      targetKey: "dni",
      as: "estudiante",
    });

    // 🔗 con Profesor
    Usuario.belongsTo(models.Profesor, {
      foreignKey: "profesorId",
      as: "profesor",
    });
  }
}

module.exports = (sequelize) => {
  Usuario.init(
    {
      usuarioId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        field: "usuarioId",
      },

      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },

      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      rol: {
        type: DataTypes.ENUM("admin", "profesor", "estudiante"),
        allowNull: false,
      },

      estudianteId: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "estudianteId",
      },

      profesorId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "profesorId",
      },
    },
    {
      sequelize,
      modelName: "Usuario",
      tableName: "usuarios",
      timestamps: true,

      // solo timestamps en snake_case
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Usuario;
};