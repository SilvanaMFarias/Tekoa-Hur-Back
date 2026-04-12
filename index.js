const express = require('express')
const { swaggerUi, swaggerSpec } = require("./swagger");

const app = express()
const port = 3001
app.use(express.json());

// Tus middlewares existentes
//const estudianteRoutes = require('./routes/estudiantes');
//app.use('/api/estudiantes', estudianteRoutes);

// ============================================
// DOCUMENTACIÓN SWAGGER
// ============================================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// ============================================

// Tus rutas existentes (ejemplo)
// const usuarioRoutes = require('./routes/usuarios');
// app.use('/api/usuarios', usuarioRoutes);

// Iniciar servidor
app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
    console.log(`📄 Documentación Swagger disponible en http://localhost:${port}/api-docs`);
});

/*
app.get('/', (req, res) => {
  res.send('App iniciada')
})


app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
*/
