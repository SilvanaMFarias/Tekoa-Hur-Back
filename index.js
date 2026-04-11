const express = require('express')
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const app = express()
const port = 3001

// Tus middlewares existentes
const estudianteRoutes = require('./routes/estudiantes');
app.use('/api/estudiantes', estudianteRoutes);
app.use(express.json());

// ============================================
// DOCUMENTACIÓN SWAGGER - AGREGAR ESTAS LÍNEAS
// ============================================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
console.log('📄 Documentación Swagger disponible en http://localhost:3001/api-docs');
// ============================================

// Tus rutas existentes (ejemplo)
// const usuarioRoutes = require('./routes/usuarios');
// app.use('/api/usuarios', usuarioRoutes);

// Iniciar servidor
app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});


app.get('/', (req, res) => {
  res.send('App iniciada')
})

/*
app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
*/
