const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi    = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title:       "API — Tekoá-Hur",
      version:     "1.0.0",
      description: "Sistema de gestión académica de UNAHUR: asistencia por QR, matrículas, reservas de espacios e importación de planillas.\n\n## Autenticación\nJWT Bearer Token — se configura automáticamente al cargar la página.\n\n## Roles\n- `alumno` — puede leer QR y ver su propio historial\n- `docente` — puede generar QR y ver asistencias de sus comisiones\n- `administrador` — acceso total al sistema",
      contact: { name: "Soporte Tekoá-Hur", email: "soporte@tekoahur.com" },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http", scheme: "bearer", bearerFormat: "JWT",
          description: "Token JWT — configurado automáticamente al cargar la página",
        },
      },
    },
    security: [{ bearerAuth: [] }],
    servers: [{ url: "http://localhost:3001", description: "Desarrollo local" }],
  },
  apis: ["./routes/*.js", "./models/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

const swaggerUiOptions = {
  docExpansion:           "none",
  displayRequestDuration: true,
  operationsSorter:       "method",
  persistAuthorization:   true,
  // Script servido como archivo estático en /public/swagger-autologin.js
  customJs:               "/swagger-autologin.js",
};

module.exports = { swaggerUi, swaggerSpec, swaggerUiOptions };