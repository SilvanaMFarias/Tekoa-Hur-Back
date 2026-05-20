/**
 * validateResetPassword.js
 * --------------------------------------------------------------
 * Middleware Express que se monta antes del controlador de
 * resetPassword (POST /api/auth/reset-password) y valida que la
 * nueva contraseña cumpla la política de seguridad definida en
 * utils/passwordValidator.js.
 *
 * ¿Por qué un middleware y no validar adentro del controlador?
 *  - Separa responsabilidades: el controlador se ocupa solo de
 *    la lógica de negocio (buscar usuario, hashear, guardar).
 *  - Permite reutilizar la misma validación en otras rutas que
 *    actualicen la contraseña (cambio obligatorio, cambio
 *    voluntario).
 *  - Devuelve un mensaje uniforme y temprano sin tocar la DB.
 */

const { validarPassword } = require("../utils/passwordValidator");

const validateResetPassword = (req, res, next) => {

  // El body llega gracias a express.json() configurado en index.js
  const { password } = req.body;

  // Delegamos toda la lógica de reglas al validador central.
  const { valid, errors } = validarPassword(password);

  if (!valid) {
    /*
     * Devolvemos:
     *  - 400 Bad Request porque el problema está en los datos
     *    enviados por el cliente, no en el servidor.
     *  - "message": un string corto para mostrar arriba del form.
     *  - "errors": un array con TODOS los requisitos incumplidos,
     *    para que el frontend pueda renderizar la lista completa.
     */
    return res.status(400).json({
      message: "La contraseña no cumple con los requisitos de seguridad.",
      errors,
    });
  }

  // Si pasó todas las validaciones, le cedemos el control al
  // siguiente middleware/controlador en la cadena.
  next();
};

module.exports = validateResetPassword;
