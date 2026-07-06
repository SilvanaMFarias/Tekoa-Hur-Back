require("dotenv").config();

const fs          = require("fs");
const express     = require("express");
const cors        = require("cors");
const session     = require("express-session");
const bodyParser  = require("body-parser");

const { swaggerUi, swaggerSpec, swaggerUiOptions } = require("./swagger");

const errorHandler = require("./middleware/errorHandlers");
const notFound     = require("./middleware/notFound");
const jwtAuth      = require("./middleware/jwtAuth");
const requireRole  = require("./middleware/requireRole");

// Routes
const authRoutes        = require("./routes/auth");
const importarRoutes    = require("./routes/importar");
const aulasRoutes       = require("./routes/aulas");
const comisionesRoutes  = require("./routes/comisiones");
const edificiosRoutes   = require("./routes/edificios");
const estudiantesRoutes = require("./routes/estudiantes");
const horariosRoutes    = require("./routes/horarios");
const materiasRoutes    = require("./routes/materias");
const matriculasRoutes  = require("./routes/matriculas");
const profesoresRoutes  = require("./routes/profesores");
const asistenciasRoutes = require("./routes/asistencias");
const feriadosRoutes    = require("./routes/feriados");
const tipoEventosRoutes = require("./routes/tipoEventos");
const qrRoutes          = require("./routes/qr");
const diaSinClaseRoutes = require("./routes/diaSinClase");
const guaraniRoutes     = require("./routes/guarani");
const reporteRoutes     = require("./routes/reporte");
const reservasRoutes    = require("./routes/reservas");
const historialImportacionRoutes = require("./routes/historialImportacion");

const app = express();

app.use(express.static("public"));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

app.use(express.json());

app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || "tekoadocsecret-cambiame",
  resave: false,
  saveUninitialized: true,
}));

// ── Swagger auth ─────────────────────────────────────────────

function checkAuth(req, res, next) {
  if (req.session?.authenticated) return next();
  res.redirect("/login");
}

app.get("/login", (req, res) => {
  res.send(`
    <html>
      <body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#f0f0f0">
        <div style="background:white;padding:2rem;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.1);width:320px;text-align:center">
          <h2>Acceso a documentación</h2>

          <form method="post" action="/login">

            <input
              name="username"
              placeholder="Usuario"
              required
              style="width:100%;padding:.7rem;margin:.4rem 0;border:1px solid #ccc;border-radius:6px;box-sizing:border-box"
            />

            <input
              name="password"
              type="password"
              placeholder="Clave"
              required
              style="width:100%;padding:.7rem;margin:.4rem 0;border:1px solid #ccc;border-radius:6px;box-sizing:border-box"
            />

            <button
              type="submit"
              style="width:100%;padding:.9rem;background:#1B5E20;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;margin-top:.5rem"
            >
              Ingresar
            </button>

          </form>
        </div>
      </body>
    </html>
  `);
});
//----Modifico para usar users.json en test-------------------
//const users = JSON.parse(fs.readFileSync("users.json", "utf8"));
let users = [];

if (process.env.NODE_ENV === "test") {
  users = [
    {
      username: process.env.TEST_USER || "test",
      password: process.env.TEST_PASSWORD || "1234",
    },
  ];
} else {
  users = JSON.parse(fs.readFileSync("users.json", "utf8"));
}

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (users[username] && users[username] === password) {
    req.session.authenticated = true;
    return res.redirect("/api-docs");
  }

  res.send("Credenciales inválidas. <a href='/login'>Volver</a>");
});

// ── Públicas ─────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/qr", qrRoutes);

// ── Protegidas ───────────────────────────────────────────────

app.use("/api/aulas", jwtAuth, aulasRoutes);
app.use("/api/comisiones", jwtAuth, comisionesRoutes);
app.use("/api/edificios", jwtAuth, edificiosRoutes);
app.use("/api/horarios", jwtAuth, horariosRoutes);
app.use("/api/materias", jwtAuth, materiasRoutes);
app.use("/api/matriculas", jwtAuth, matriculasRoutes);
app.use("/api/profesores", jwtAuth, profesoresRoutes);
app.use("/api/feriados", jwtAuth, feriadosRoutes);
app.use("/api/tipoEventos", jwtAuth, tipoEventosRoutes);
app.use("/api/asistencias", jwtAuth, asistenciasRoutes);
app.use("/api/diaSinClase", jwtAuth, diaSinClaseRoutes);
app.use("/api/guarani", jwtAuth, guaraniRoutes);
app.use("/api/reportes",jwtAuth ,reporteRoutes);
app.use("/api/reservas", jwtAuth, reservasRoutes);

// ── Estudiantes ──────────────────────────────────────────────

const alumnoOAdmin = (req, res, next) => {
  const { rol, dni } = req.usuario;

  if (rol === "docente" || rol === "administrador") {
    return next();
  }

  if (rol === "alumno") {

    const idEnPath = req.path
      .replace("/", "")
      .split("?")[0];

    if (
      req.method === "GET" &&
      idEnPath === dni
    ) {
      return next();
    }

    return res.status(403).json({
      message: "Solo podés ver tu propio perfil de estudiante.",
    });
  }

  return res.status(403).json({
    message: "Acceso denegado.",
  });
};

app.use(
  "/api/estudiantes",
  jwtAuth,
  alumnoOAdmin,
  estudiantesRoutes
);

// ── Solo admin ───────────────────────────────────────────────

app.use(
  "/api/importar",
  jwtAuth,
  requireRole("administrador"),
  importarRoutes
);

// ── Historial de importaciones ───────────────────────────────
app.use(
  "/api/historial-importaciones",
  jwtAuth,
  requireRole("administrador"),
  historialImportacionRoutes
);

// ── Swagger ──────────────────────────────────────────────────

app.use(
  "/api-docs",
  checkAuth,
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, swaggerUiOptions)
);

app.get("/", (req, res) => {
  res.send("Servidor iniciado correctamente 🚀");
});

// ── Error handling ───────────────────────────────────────────

app.use(notFound);
app.use(errorHandler);

module.exports = app;