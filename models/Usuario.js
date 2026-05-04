const { Model, DataTypes } = require("sequelize");

/**
 * Modelo Usuario — tabla de autenticación del sistema.
 *
 * Roles:
 *  - "alumno"        → leer QR + historial propio
 *  - "docente"       → generar QR + asistencias de sus comisiones
 *  - "administrador" → acceso total
 *
 * referenciaId: conecta con Estudiante.dni (alumno) o Profesor.dni (docente)
 */
class Usuario extends Model {}

module.exports = (sequelize) => {
  Usuario.init(
    {
      usuarioId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      dni: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { notEmpty: true },
      },
      nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: true },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Hash bcrypt — nunca guardar en texto plano",
      },
      rol: {
        type: DataTypes.ENUM("alumno", "docente", "administrador"),
        allowNull: false,
        defaultValue: "alumno",
      },
      referenciaId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "DNI del Estudiante o Profesor según el rol",
      },
      activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "Usuario",
      tableName: "usuarios",
      timestamps: true,
    }
  );

  return Usuario;
};
