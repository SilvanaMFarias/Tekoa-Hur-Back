const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API - Tekoa Hur Back',
      version: '1.0.0',
      description: 'Documentación de la API del sistema académico Tekoa-Hur',
      contact: {
        name: 'Soporte',
        email: 'soporte@tekoahur.com'
      },
    },
    components: {
      securitySchemes: {
        basicAuth: {
          type: 'http',
          scheme: 'basic',   // 👈 CORREGIDO (antes estaba mal escrito como "sheme")
        },
      },
    },
    security: [
      {
        basicAuth: [],       // 👈 Esto aplica Basic Auth a todos los endpoints
      },
    ],
    servers: [
      {
        url: process.env.BASE_URL || "http://localhost:3001/api",
        description: 'Servidor de desarrollo'
      },
    ],
  },
  apis: ['./routes/*.js', './models/*.js'], // Documenta tus rutas y modelos
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = { swaggerUi, swaggerSpec };
