require("dotenv").config();

const express = require("express");
const sequelize = require("./config/database"); // conexión Sequelize
const { swaggerUi, swaggerSpec } = require("./swagger");

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

// ===============================
// RUTAS CRUD
// ===============================
app.use("/api/estudiantes", require("./routes/estudiantes"));
app.use("/api/edificios", require("./routes/edificios"));
app.use("/api/aulas", require("./routes/aulas"));
app.use("/api/materias", require("./routes/materias"));
app.use("/api/profesores", require("./routes/profesores"));
app.use("/api/comisiones", require("./routes/comisiones"));
app.use("/api/matriculas", require("./routes/matriculas"));
app.use("/api/horarios", require("./routes/horarios"));
app.use("/api/asistencias", require("./routes/asistencias"));

// ===============================
// DOCUMENTACIÓN SWAGGER
// ===============================
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ===============================
// ENDPOINT DE PRUEBA
// ===============================
app.get("/", (req, res) => {
  res.send("Servidor iniciado correctamente 🚀");
});

// ===============================
// INICIAR SERVIDOR
// ===============================
sequelize.sync().then(() => {
  app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
    console.log(`Swagger disponible en http://localhost:${port}/api-docs`);
  });
}).catch(err => {
  console.error("Error al conectar con la base de datos:", err);
});
