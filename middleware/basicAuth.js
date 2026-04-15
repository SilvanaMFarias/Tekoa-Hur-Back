require("dotenv").config();

const basicAuth = (req, res, next) => {
  // Si no hay headers, corta antes
  if (!req || !req.headers) {
    return res.status(400).json({ message: "Request inválido" });
  }

  const authHeader = req.headers["authorization"];
  console.log("Authorization recibido:", authHeader);

  if (!authHeader) {
    return res.status(401).json({ message: "Falta encabezado Authorization" });
  }

  const [scheme, encoded] = authHeader.split(" ");
  if (scheme !== "Basic" || !encoded) {
    return res.status(401).json({ message: "Formato de Authorization inválido" });
  }

  const credentials = Buffer.from(encoded, "base64").toString("ascii");
  const [user, password] = credentials.split(":");

  if (user === process.env.BASIC_USER && password === process.env.BASIC_PASS) {
    next();
  } else {
    return res.status(403).json({ message: "Credenciales inválidas" });
  }
};

module.exports = basicAuth;