const sequelize = require("../../config/database");

beforeAll(async () => {
  await sequelize.authenticate(); //verifica la conexión a la base de datos
});

beforeEach(async () => {
  await sequelize.sync({ force: true }); //borra tablas, recrea tablas y deja DB limpia
});

afterAll(async () => {
  await sequelize.close(); //cierra la conexión a la base de datos después de todas las pruebas
});