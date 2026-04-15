/*
Función: proteger las rutas del backend.
Método: autenticación básica HTTP.
Seguridad: credenciales almacenadas en .
Resultado: solo usuarios autorizados pueden acceder a los endpoints.
*/
require("dotenv").config();

const basicAuth = (req, res, next) => {
  // Si no hay headers, corta antes
  // funcion que intercepta cada solicitud antes de llear a la ruta protegida
  if (!req || !req.headers) {
    // Si la solicitud no tiene encabezados, se corta inmediatamente con un error 400
    return res.status(400).json({ message: "Request inválido" });
  }

  const authHeader = req.headers["authorization"];
  console.log("Authorization recibido:", authHeader);

  if (!authHeader) {
    return res.status(401).json({ message: "Falta encabezado Authorization" });
  }

  const [scheme, encoded] = authHeader.split(" ");
  if (scheme !== "Basic" || !encoded) {
    // Se asegura de que el esquema sea “Basic” y que haya un token codificado
    return res.status(401).json({ message: "Formato de Authorization inválido" });
  }

  const credentials = Buffer.from(encoded, "base64").toString("ascii");
  const [user, password] = credentials.split(":");
  // Convierte el token Base64 en texto plano
  // Extrae el usuario y la contraseña separados por “:”

  if (user === process.env.BASIC_USER && password === process.env.BASIC_PASS) {
    next();
  } else {
    return res.status(403).json({ message: "Credenciales inválidas" });
  }
  // Si las credenciales coinciden con las del .env, se llama a next() y la solicitud continúa.
};

module.exports = basicAuth;