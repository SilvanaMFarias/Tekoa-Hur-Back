'use strict';

/**
 * models/index.js — Punto de entrada de todos los modelos Sequelize.
 *
 * IMPORTANTE: usa la instancia de config/database.js para que tanto
 * el servidor (index.js) como los modelos compartan la MISMA conexión
 * y las mismas credenciales definidas en .env → DATABASE_URL.
 *
 * Esto evita el problema de tener dos instancias de Sequelize distintas
 * (una en config/database.js y otra en models/index.js con config.json).
 */

require('dotenv').config();

const fs        = require('fs');
const path      = require('path');
const Sequelize = require('sequelize');
const basename  = path.basename(__filename);

// ✅ Usar la instancia única definida en config/database.js
// Allí se lee DATABASE_URL del .env → una sola fuente de verdad
const sequelize = require('../config/database');

const db = {};

// Cargar automáticamente todos los modelos .js de esta carpeta
fs.readdirSync(__dirname)
  .filter(file =>
    file.indexOf('.') !== 0 &&
    file !== basename &&
    file.slice(-3) === '.js' &&
    !file.includes('.test.js')
  )
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// Ejecutar asociaciones entre modelos
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
