const validateResetPassword = ( req, res, next) => {

  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      message:
        "La nueva contraseña es requerida.",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      message:
        "La contraseña debe tener al menos 6 caracteres.",
    });
  }

  next();
};

module.exports = validateResetPassword;