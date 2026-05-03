/*
 permite dos formas de autenticación:

1) JWT (cookie) → para usuarios reales de la app
2) Basic Auth → fallback para Swagger / testing

Flujo:
- Si hay cookie → valida JWT
- Si NO hay cookie → intenta Basic Auth
- Si nada funciona → rechaza request

*/

require("dotenv").config();
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

const auth = (req, res, next) => {
  try {
    // --> JWT DESDE COOKIE
    
    /*
    - El frontend (Next.js) guarda el token en cookie httpOnly
    - El navegador la envía automáticamente en cada request
    - Acá la leemos para identificar al usuario
    */

    const token = req.cookies?.token;

    if (token) {
      try {
        // Verificamos el token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Guardamos info del usuario en la request
        req.user = decoded;

        // Continuamos a la ruta protegida
        return next();
      } catch {
        // Token inválido o expirado
        return res.status(401).json({ message: "Token inválido" });
      }
    }

    // --> FALLBACK: BASIC AUTH 

    /*
    - Solo se ejecuta si NO hay cookie
    - Se usa principalmente para Swagger
    - Requiere header Authorization: Basic xxx
    */

    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const [scheme, encoded] = authHeader.split(" ");

    if (scheme !== "Basic" || !encoded) {
      return res.status(401).json({ message: "Formato de Authorization inválido" });
    }

    // Decodificamos base64 → "usuario:password"
    const credentials = Buffer.from(encoded, "base64").toString("ascii");
    const [user, password] = credentials.split(":");

    if (
      user === process.env.BASIC_USER &&
      password === process.env.BASIC_PASS
    ) {
      // Simulamos usuario autenticado (opcional)
      req.user = { rol: "admin_basic" };

      return next();
    }

    // Credenciales incorrectas
    return res.status(403).json({ message: "Credenciales inválidas" });

  } catch (error) {
    console.error("Auth error:", error);
    return res.status(500).json({ message: "Error de autenticación" });
  }
};

module.exports = auth;