const { generateResetToken,} = require("../utils/tokenGenerator");

const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const { Usuario } = require("../models");

const { sendRecoveryEmail,} = require("../services/emailService");

const SALT = 10;

const resetPasswordTemplate = require("../templates/resetPasswordTemplate");

/**
 * POST /api/auth/forgot-password
 */
exports.forgotPassword = async (
  req,
  res
) => {
  try {

    const { email } = req.body;

    /**
     * Validar email
     */
    if (!email) {
      return res.status(400).json({
        message:
          "El email es requerido.",
      });
    }

    /**
     * Buscar usuario
     */
    const usuario =
      await Usuario.findOne({
        where: {
          email: String(email).trim(),
          activo: true,
        },
      });

    /**
     * Nunca revelar existencia
     */
    if (!usuario) {
      return res.status(200).json({
        message:
          "Si el email se encuentra registrado, se enviaron las instrucciones al mismo.",
      });
    }

    /**
     * Generar token seguro
     */
    const resetToken = generateResetToken();

    /**
     * Hashear token
     */
    const hashedToken =
      await bcrypt.hash(
        resetToken,
        SALT
      );

    /**
     * Expiración: 1 hora
     */
    const expiration =
      new Date(
        Date.now() +
        60 * 60 * 1000
      );

    /**
     * Guardar token
     */
    usuario.resetPasswordToken =
      hashedToken;

    usuario.resetPasswordExpires =
      expiration;

    await usuario.save();

    /**
     * Enviar email mock
     */
    //await sendRecoveryEmail(
    //  usuario.email,
    //  resetToken
    //);

    /**
     * Enviar email real con link y template
     */
    const resetLink =
      `${process.env.FRONTEND_URL}` +
      `/reset-password?token=${resetToken}` +
      `&email=${usuario.email}`;

    const html =
      resetPasswordTemplate(
        resetLink,
        usuario.nombre
    );

    await sendRecoveryEmail(
      usuario.email,
      resetLink,
      html
    );

    return res.status(200).json({
      message:
        "Si el email se encuentra registrado, se enviaron las instrucciones al mismo.",
    });

  } catch (err) {

    console.error(
      "Error forgotPassword:",
      err
    );

    return res.status(500).json({
      message:
        "Error interno del servidor.",
    });
  }
};

/**
 * POST /api/auth/reset-password
 */
exports.resetPassword = async (
  req,
  res
) => {

  try {

    const {
      email,
      token,
      password,
    } = req.body;

    /**
     * Validar datos
     */
    if (!email || !token) {
      return res.status(400).json({
        message:
          "Email y token son requeridos.",
      });
    }

    /**
     * Buscar usuario
     */
    const usuario =
      await Usuario.findOne({
        where: {
          email: String(email).trim(),
          activo: true,
        },
      });

    if (!usuario) {
      return res.status(400).json({
        message:
          "Token inválido.",
      });
    }

    /**
     * Validar expiración
     */
    if (
      !usuario.resetPasswordExpires ||
      usuario.resetPasswordExpires <
        new Date()
    ) {
      return res.status(400).json({
        message:
          "Token expirado.",
      });
    }

    /**
     * Comparar token
     */
    const isValidToken =
      await bcrypt.compare(
        token,
        usuario.resetPasswordToken
      );

    if (!isValidToken) {
      return res.status(400).json({
        message:
          "Token inválido.",
      });
    }

    /**
     * Hashear nueva password
     */
    usuario.password =
      await bcrypt.hash(
        String(password),
        SALT
      );

    /**
     * Limpiar token
     */
    usuario.resetPasswordToken =
      null;

    usuario.resetPasswordExpires =
      null;

    await usuario.save();

    return res.status(200).json({
      message:
        "Contraseña actualizada correctamente.",
    });

  } catch (err) {

    console.error(
      "Error resetPassword:",
      err
    );

    return res.status(500).json({
      message:
        "Error interno del servidor.",
    });
  }
};