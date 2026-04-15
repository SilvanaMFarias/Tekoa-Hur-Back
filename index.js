require("dotenv").config();

const cors = require("cors");

const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const sequelize = require("./config/database");
const { swaggerUi, swaggerSpec } = require("./swagger");

const app = express();
const port = process.env.PORT || 3001;

app.use(express.static("public"));

// habilitar CORS para el front
app.use(cors({
  origin: "http://localhost:3000", // dirección de tu front
  credentials: true
}));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuración de sesión
app.use(session({
  secret: "tekoadocsecret", // clave interna para firmar la cookie
  resave: false,
  saveUninitialized: true,
}));

// Middleware para proteger /api-docs
function checkAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  } else {
    res.redirect("/login");
  }
}

// Ruta de login
app.get("/login", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Login Tekoa-Hur</title>
        <style>
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #ffffff;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
          }
          .login-box {
            background: #f9f9f9;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            text-align: center;
            width: 360px;
          }
          .login-box img {
            width: 140px;
            margin-bottom: 1rem;
          }
          .login-box h2 {
            margin-bottom: 1rem;
            color: #333;
            font-weight: bold;
          }
          .login-box input {
            width: 100%;
            padding: 0.7rem;
            margin: 0.6rem 0;
            border: 1px solid #ccc;
            border-radius: 6px;
            font-size: 1rem;
          }
          .login-box button {
            background: #333;
            color: white;
            border: none;
            padding: 0.9rem;
            width: 100%;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            font-size: 1rem;
          }
          .login-box button:hover {
            background: #555;
          }
        </style>
      </head>
      <body>
        <div class="login-box">
          <img src="/logo.png" alt="Logo Tekoa-Hur" />
          <h2>Acceso a documentación</h2>
          <form method="post" action="/login">
            <input type="text" name="username" placeholder="Usuario" required />
            <input type="password" name="password" placeholder="Clave" required />
            <button type="submit">Ingresar</button>
          </form>
        </div>
      </body>
    </html>
  `);
});

// Procesar login
//const fs = require("fs");
//const users = JSON.parse(fs.readFileSync("users.json", "utf8"));
require("dotenv").config();
const getUsers = require("./config/users");

const users = getUsers();

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (users[username] && users[username] === password) {
    req.session.authenticated = true;
    res.redirect("/api-docs");
  } else {
    res.send("Credenciales inválidas. <a href='/login'>Volver</a>");
  }
});

// Swagger protegido
app.use("/api-docs", checkAuth, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas CRUD (sin login adicional)
app.use("/api/estudiantes", require("./routes/estudiantes"));
app.use("/api/edificios", require("./routes/edificios"));
app.use("/api/aulas", require("./routes/aulas"));
app.use("/api/materias", require("./routes/materias"));
app.use("/api/profesores", require("./routes/profesores"));
app.use("/api/comisiones", require("./routes/comisiones"));
app.use("/api/matriculas", require("./routes/matriculas"));
app.use("/api/horarios", require("./routes/horarios"));
app.use("/api/asistencias", require("./routes/asistencias"));


app.get("/", (req, res) => {
  res.send("Servidor iniciado correctamente 🚀");
});

sequelize.sync().then(() => {
  app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
    console.log(`Swagger disponible en http://localhost:${port}/api-docs`);
  });
}).catch(err => {
  console.error("Error al conectar con la base de datos:", err);
});