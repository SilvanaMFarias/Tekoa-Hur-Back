/**
 * basicAuth — Middleware de autenticación HTTP Basic.
 *
 * Verifica el header Authorization: Basic <base64(usuario:contraseña)>
 * contra las credenciales definidas en .env (BASIC_USER / BASIC_PASS).
 *
 * Nota: actualmente no se usa en las rutas principales de la API
 * (reemplazado por JWT). Se mantiene por compatibilidad y para
 * posibles integraciones externas.
 */
const basicAuth = (req, res, next) => {
  if (!req?.headers) {
    return res.status(400).json({ message: "Request inválido" });
  }

  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ message: "Falta encabezado Authorization" });
  }

  const [scheme, encoded] = authHeader.split(" ");

  if (scheme !== "Basic" || !encoded) {
    return res.status(401).json({ message: "Formato de Authorization inválido" });
  }

  const credentials = Buffer.from(encoded, "base64").toString("ascii");
  const [user, password] = credentials.split(":");

  if (
    user     === process.env.BASIC_USER &&
    password === process.env.BASIC_PASS
  ) {
    return next();
  }

  return res.status(403).json({ message: "Credenciales inválidas" });
};

module.exports = basicAuth;
