const bcrypt = require("bcryptjs");
const { Usuario } = require("../models");
const { generateResetToken,} = require("../utils/tokenGenerator");

const { sendRecoveryEmail,} = require("../services/emailService");
const SALT = 10;

/**
 * POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "El email es requerido.",
      });
    }

    const usuario = await Usuario.findOne({
      where: {
        email: String(email).trim(),
        activo: true,
      },
    });

    /**
     * Nunca revelar si existe el email
     */
    if (!usuario) {
      return res.status(200).json({
        message:
          "Si el email se encuentra registrado, se enviaron las instrucciones al mismo.",
      });
    }

    /**
     * Generar token
     */
    const resetToken = generateResetToken();

    /**
     * Expiración: 1 hora
     */
    const expiration = new Date(
      Date.now() + 60 * 60 * 1000
    );

    usuario.resetPasswordToken = resetToken;
    usuario.resetPasswordExpires = expiration;

    await usuario.save();

    /**
     * Enviar email
     */
    await sendRecoveryEmail(
      usuario.email,
      resetToken
    );

    return res.status(200).json({
      message:
        "Si el email se encuentra registrado, se enviaron las instrucciones al mismo.",
    });

  } catch (err) {
    console.error("Error forgotPassword:", err);

    return res.status(500).json({
      message: "Error interno del servidor.",
    });
  }
};

/**
 * POST /api/auth/reset-password
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        message: "Token y contraseña son requeridos.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message:
          "La contraseña debe tener al menos 6 caracteres.",
      });
    }

    const usuario = await Usuario.findOne({
      where: {
        resetPasswordToken: token,
        activo: true,
      },
    });

    if (!usuario) {
      return res.status(400).json({
        message: "Token inválido.",
      });
    }

    /**
     * Validar expiración
     */
    if (
      usuario.resetPasswordExpires &&
      usuario.resetPasswordExpires < new Date()
    ) {
      return res.status(400).json({
        message: "Token expirado.",
      });
    }

    /**
     * Hash password
     */
    usuario.password = await bcrypt.hash(
      String(newPassword),
      SALT
    );

    /**
     * Limpiar token
     */
    usuario.resetPasswordToken = null;
    usuario.resetPasswordExpires = null;

    await usuario.save();

    return res.status(200).json({
      message:
        "Contraseña actualizada correctamente.",
    });

  } catch (err) {
    console.error("Error resetPassword:", err);

    return res.status(500).json({
      message: "Error interno del servidor.",
    });
  }
};