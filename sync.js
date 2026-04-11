// Este script crea las tablas si no existen con los models.
const db = require('./models');

async function main() {
  await db.sequelize.sync({ alter: true });
  console.log("DB lista");
}

main();