require("dotenv").config();

// Carga las variables de entorno desde .env (por ejemplo, el puerto o credenciales)
const errorHandler = require("./middleware/errorHandlers");
const notFound = require("./middleware/notFound");

const cors = require("cors");
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const sequelize = require("./config/database");
const { swaggerUi, swaggerSpec } = require("./swagger");

// Crear la app primero
const app = express();
const port = process.env.PORT || 3001;

// Middlewares iniciales
app.use(express.static("public"));
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuración de sesión
app.use(session({
  secret: "tekoadocsecret",
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
const fs = require("fs");
const users = JSON.parse(fs.readFileSync("users.json", "utf8"));

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (users[username] && users[username] === password) {
    req.session.authenticated = true;
    res.redirect("/api-docs");
  } else {
    res.send("Credenciales inválidas. <a href='/login'>Volver</a>");
  }
});

// Importar rutas
const importarRoutes = require("./routes/importar");
const aulasRoutes = require("./routes/aulas");
const comisionesRoutes = require("./routes/comisiones");
const edificiosRoutes = require("./routes/edificios");
const estudiantesRoutes = require("./routes/estudiantes");
const horariosRoutes = require("./routes/horarios");
const materiasRoutes = require("./routes/materias");
const matriculasRoutes = require("./routes/matriculas");
const profesoresRoutes = require("./routes/profesores");
const asistenciasRoutes = require("./routes/asistencias");
const qrRoutes = require("./routes/qr");

// Usar rutas
app.use("/api/importar", importarRoutes);
app.use("/api/aulas", aulasRoutes);
app.use("/api/comisiones", comisionesRoutes);
app.use("/api/edificios", edificiosRoutes);
app.use("/api/estudiantes", estudiantesRoutes);
app.use("/api/horarios", horariosRoutes);
app.use("/api/materias", materiasRoutes);
app.use("/api/matriculas", matriculasRoutes);
app.use("/api/profesores", profesoresRoutes);
app.use("/api/asistencias", asistenciasRoutes);
app.use("/api/qr", qrRoutes);

// Swagger protegido
function checkAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  } else {
    res.redirect("/login");
  }
}
app.use("/api-docs", checkAuth, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Ruta raíz
app.get("/", (req, res) => {
  res.send("Servidor iniciado correctamente 🚀");
});

app.use(notFound);      
app.use(errorHandler);

// Conexión DB y levantar servidor
sequelize.sync().then(() => {
  app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
    console.log(`Swagger disponible en http://localhost:${port}/api-docs`);
  });
}).catch(err => {
  console.error("Error al conectar con la base de datos:", err);
});
