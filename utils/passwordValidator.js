/**
 * passwordValidator.js
 * --------------------------------------------------------------
 * Política única y centralizada de validación de contraseñas.
 *
 * Se centraliza acá para que TODOS los flujos del backend
 * (reset por token, cambio voluntario, cambio obligatorio en
 * primer ingreso) apliquen exactamente las mismas reglas y un
 * cambio futuro a la política se haga en un único lugar.
 *
 * Reglas que aplicamos:
 *  1. Mínimo 8 caracteres.
 *  2. Al menos una letra mayúscula (A-Z).
 *  3. Al menos un carácter especial (no alfanumérico).
 */

/**
 * Longitud mínima exigida.
 * Se exporta como constante para poder reutilizarla en mensajes
 * de error y en eventuales tests, sin "magic numbers".
 */
const MIN_LENGTH = 8;

/**
 * Expresión regular para detectar al menos una mayúscula.
 * [A-Z] coincide con cualquier letra mayúscula latina sin tilde.
 * .test() devuelve true si encuentra coincidencia.
 */
const REGEX_MAYUSCULA = /[A-Z]/;

/**
 * Expresión regular para detectar al menos un carácter especial.
 *
 * Definición: "carácter especial" = cualquier cosa que NO sea
 * letra (a-z, A-Z) ni número (0-9). Por eso usamos la clase
 * negada `[^a-zA-Z0-9]`, que es más permisiva y portable que
 * listar uno por uno (!, @, #, $, %, etc.) y además acepta
 * símbolos del teclado español (¡, ¿, ñ).
 */
const REGEX_ESPECIAL = /[^a-zA-Z0-9]/;

/**
 * validarPassword(password)
 * --------------------------------------------------------------
 * Recibe una contraseña en texto plano y devuelve un objeto con:
 *   { valid: boolean, errors: string[] }
 *
 * No lanza excepciones (devuelve el resultado en el objeto) para
 * que los controladores decidan cómo responder al cliente.
 *
 * Devolver TODOS los errores en lugar de cortar al primero
 * permite que el frontend muestre la lista completa de requisitos
 * incumplidos en un solo render, mejorando la UX.
 */
function validarPassword(password) {
  // Si no llega o llega vacía no tiene sentido aplicar reglas:
  // se reporta como inválida con un único mensaje claro.
  if (!password || typeof password !== "string") {
    return {
      valid:  false,
      errors: ["La contraseña es requerida."],
    };
  }

  // Acumulamos todos los errores en este arreglo.
  // Si al final queda vacío, la contraseña pasa la validación.
  const errors = [];

  // Regla 1: longitud mínima
  if (password.length < MIN_LENGTH) {
    errors.push(`Debe tener al menos ${MIN_LENGTH} caracteres.`);
  }

  // Regla 2: al menos una mayúscula
  if (!REGEX_MAYUSCULA.test(password)) {
    errors.push("Debe incluir al menos una letra mayúscula.");
  }

  // Regla 3: al menos un carácter especial
  if (!REGEX_ESPECIAL.test(password)) {
    errors.push("Debe incluir al menos un carácter especial (ej: !, @, #, $).");
  }

  // valid = true sólo si no se acumuló ningún error.
  return {
    valid:  errors.length === 0,
    errors,
  };
}

/**
 * Exportamos también las constantes para que el frontend pueda
 * (si quiere) consumirlas vía un endpoint de configuración o
 * simplemente para que otros archivos del backend las usen.
 */
module.exports = {
  validarPassword,
  MIN_LENGTH,
  REGEX_MAYUSCULA,
  REGEX_ESPECIAL,
};
