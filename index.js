// ============================================================
// index.js — Punto de entrada del servidor
// ============================================================
// FIXES aplicados:
//  ✅ checkAuth declarada UNA sola vez (estaba duplicada → Node
//     la redeclaraba en el mismo scope, undefined behavior)
//  ✅ require("fs") movido arriba de donde se usa
//  ✅ CORS y session secret desde variables de entorno
//  ✅ process.exit(1) si la DB falla al arrancar
// ============================================================

require("dotenv").config();

const fs          = require("fs");                    // ← DEBE ir antes de readFileSync
const express     = require("express");
const cors        = require("cors");
const session     = require("express-session");
const bodyParser  = require("body-parser");
const sequelize   = require("./config/database");
const { swaggerUi, swaggerSpec } = require("./swagger");

const errorHandler = require("./middleware/errorHandlers");
const notFound     = require("./middleware/notFound");

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

// ✅ CORS desde variable de entorno
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ Session secret desde variable de entorno
app.use(session({
  secret: process.env.SESSION_SECRET || "tekoadocsecret-cambiame",
  resave: false,
  saveUninitialized: true,
}));

// ✅ checkAuth declarada UNA sola vez
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
        <button type="submit" style="width:100%;padding:.9rem;background:#333;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;margin-top:.5rem">Ingresar</button>
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

app.use("/api/importar",    importarRoutes);
app.use("/api/aulas",       aulasRoutes);
app.use("/api/comisiones",  comisionesRoutes);
app.use("/api/edificios",   edificiosRoutes);
app.use("/api/estudiantes", estudiantesRoutes);
app.use("/api/horarios",    horariosRoutes);
app.use("/api/materias",    materiasRoutes);
app.use("/api/matriculas",  matriculasRoutes);
app.use("/api/profesores",  profesoresRoutes);
app.use("/api/asistencias", asistenciasRoutes);
app.use("/api/feriados",    feriadosRoutes);
app.use("/api/tipoEventos", tipoEventosRoutes);
app.use("/api/qr",          qrRoutes);

app.use("/api-docs", checkAuth, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/", (req, res) => res.send("Servidor iniciado correctamente 🚀"));

app.use(notFound);
app.use(errorHandler);

sequelize.sync().then(() => {
  app.listen(port, () => {
    console.log(`✅  http://localhost:${port}`);
    console.log(`📄  http://localhost:${port}/api-docs`);
  });
}).catch(err => {
  console.error("❌ Error DB:", err);
  process.exit(1);
});
