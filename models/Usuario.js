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
      email: { 
        type: DataTypes.STRING, 
        allowNull: true,
        unique: false,
        validate: { isEmail: true }
      },
        resetPasswordToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      resetPasswordExpires: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      /**
       * Flag de cambio obligatorio de contraseña.
       *
       * Cuándo se pone en true:
       *  - Al crear un usuario nuevo (alta manual o por seed/Excel).
       *  - Al resetear la contraseña desde el panel de administrador
       *    (porque la nueva contraseña pasa a ser el DNI = inseguro).
       *
       * Cuándo se pone en false:
       *  - Cuando el propio usuario cambia su contraseña por una
       *    que cumple la política de seguridad (≥8 chars, mayúscula,
       *    carácter especial).
       *
       * Cómo lo usa el frontend:
       *  - Al hacer login, el backend incluye este flag en el payload
       *    JWT y en la respuesta. Si viene en true, el frontend
       *    redirige automáticamente a /cambio-obligatorio en lugar de
       *    permitir el acceso normal a la aplicación.
       */
      cambioPasswordObligatorio: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "Si es true, el usuario debe cambiar su clave antes de poder operar.",
      },
      rol: {
        type: DataTypes.ENUM("alumno", "docente", "administrador"),
        allowNull: false,
        defaultValue: "alumno",
      },
      estado: {
        type: DataTypes.ENUM(
          "PRESENTE",
          "AUSENTE",
          "TARDE",
          "JUSTIFICADA",
          "PARO",
          "FERIADO",
          "CANCELACION"
        ),
        allowNull: false,
        defaultValue: "AUSENTE",},

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
