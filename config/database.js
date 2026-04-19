const { Sequelize } = require("sequelize");

const dbUrl = new URL(
  process.env.DATABASE_URL || "postgres://postgres:postgres123@localhost:5432/tekoadb"
);

const sequelize = new Sequelize({
  dialect: "postgres",
  host: dbUrl.hostname,
  port: dbUrl.port,
  username: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  logging: false,
});

module.exports = sequelize;