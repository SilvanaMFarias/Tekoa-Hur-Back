const validateResetPassword = ( req, res, next) => {

  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({
      message:
        "La nueva contraseña es requerida.",
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      message:
        "La contraseña debe tener al menos 6 caracteres.",
    });
  }

  next();
};

module.exports = validateResetPassword;