require("dotenv").config();

const fs          = require("fs");
const express     = require("express");
const cors        = require("cors");
const session     = require("express-session");
const bodyParser  = require("body-parser");
const sequelize   = require("./config/database");
const { swaggerUi, swaggerSpec } = require("./swagger");

const errorHandler = require("./middleware/errorHandlers");
const notFound     = require("./middleware/notFound");
const jwtAuth      = require("./middleware/jwtAuth");       // ✅ NUEVO
const requireRole  = require("./middleware/requireRole");    // ✅ NUEVO

// Routes
const authRoutes        = require("./routes/auth");          // ✅ NUEVO
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

const app  = express();
const port = process.env.PORT || 3001;

app.use(express.static("public"));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || "tekoadocsecret-cambiame",
  resave: false,
  saveUninitialized: true,
}));

// ── Login de Swagger (sesión, no JWT) ───────────────────────
function checkAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  res.redirect("/login");
}

app.get("/login", (req, res) => {
  res.send(`<html><body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#f0f0f0">
    <div style="background:white;padding:2rem;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.1);width:320px;text-align:center">
      <h2>Acceso a documentación</h2>
      <form method="post" action="/login">
        <input name="username" placeholder="Usuario" required style="width:100%;padding:.7rem;margin:.4rem 0;border:1px solid #ccc;border-radius:6px;box-sizing:border-box"/>
        <input name="password" type="password" placeholder="Clave" required style="width:100%;padding:.7rem;margin:.4rem 0;border:1px solid #ccc;border-radius:6px;box-sizing:border-box"/>
        <button type="submit" style="width:100%;padding:.9rem;background:#1B5E20;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;margin-top:.5rem">Ingresar</button>
      </form>
    </div>
  </body></html>`);
});

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

// ── Ruta pública de autenticación (no requiere JWT) ──────────
app.use("/api/auth", authRoutes);

// ── Ruta pública: escaneo de QR (el alumno no tiene sesión) ──
// registrar-desde-qr y validar son públicos — el rtoken es la "auth"
app.use("/api/qr", qrRoutes);

// ── Rutas protegidas con JWT ─────────────────────────────────
// Cualquier rol puede acceder a estas rutas (autenticación mínima)
app.use("/api/aulas",       jwtAuth, aulasRoutes);
app.use("/api/comisiones",  jwtAuth, comisionesRoutes);
app.use("/api/edificios",   jwtAuth, edificiosRoutes);
app.use("/api/horarios",    jwtAuth, horariosRoutes);
app.use("/api/materias",    jwtAuth, materiasRoutes);
app.use("/api/matriculas",  jwtAuth, matriculasRoutes);
app.use("/api/profesores",  jwtAuth, profesoresRoutes);
app.use("/api/feriados",    jwtAuth, feriadosRoutes);
app.use("/api/tipoEventos", jwtAuth, tipoEventosRoutes);
app.use("/api/asistencias", jwtAuth, asistenciasRoutes);

// Solo docentes y administradores pueden ver el padrón completo
app.use("/api/estudiantes", jwtAuth, requireRole("docente", "administrador"), estudiantesRoutes);

// Solo administradores pueden importar planillas
app.use("/api/importar",    jwtAuth, requireRole("administrador"), importarRoutes);

// ── Swagger ──────────────────────────────────────────────────
app.use("/api-docs", checkAuth, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/", (req, res) => res.send("Servidor iniciado correctamente 🚀"));

app.use(notFound);
app.use(errorHandler);

sequelize.sync().then(() => {
  app.listen(port, () => {
    console.log(`✅  http://localhost:${port}`);
    console.log(`📄  http://localhost:${port}/api-docs`);
    console.log(`🔑  POST /api/auth/seed → crear usuarios de prueba`);
  });
}).catch(err => {
  console.error("❌ Error DB:", err);
  process.exit(1);
});
