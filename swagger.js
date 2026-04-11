const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API - Tekoa Hur Back',
            version: '1.0.0',
            description: 'Documentación de la API del sistema académico Tekoa Hur',
            contact: {
                name: 'Soporte',
                email: 'soporte@tekoahur.com'
            }
        },
        servers: [
            {
                url: 'http://localhost:3001',
                description: 'Servidor de desarrollo'
            }
        ]
    },
    // Buscará documentación en archivos .js dentro de routes/ y models/
    apis: ['./routes/*.js', './models/*.js']
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;