 
const { Sequelize } = require("sequelize");

let sequelize;

if (process.env.DB_HOST) {
  // Dokploy
  sequelize = new Sequelize({
    dialect: "postgres",
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    logging: false,
  });
} else {
  // Desarrollo local
const dbUrl = new URL(
  process.env.DATABASE_URL || "postgres:postgres123@localhost:5432/tekoadb"
);

  sequelize = new Sequelize({
    dialect: "postgres",
    host: dbUrl.hostname,
    port: dbUrl.port,
    username: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.substring(1),
    logging: false,
  });
}

module.exports = sequelize;
