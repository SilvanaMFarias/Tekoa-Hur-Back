require("../setup/test-db");

const request = require("supertest");
const app = require("../../app");
const { Usuario } = require("../../models");
const { crearUsuario } = require("../setup/factories"); // Importamos tu factory

describe("PUT /api/auth/cambiar-password", () => {
  let token;

  beforeEach(async () => {
    // Limpieza para evitar colisiones de DNI único
    await Usuario.destroy({ where: {}, cascade: true, force: true });

    // Se usa el factory para crear el usuario administrador
    // paso una password fija para poder usarla en el login del test
    await crearUsuario({
      dni: "12345678",
      password: "admin123",
      rol: "administrador",
      nombre: "Admin Test"
    });

    // login para obtener el token real del ciclo de la app
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        dni: "12345678",
        password: "admin123",
      });

    token = loginResponse.body.token;
  });

  it("debería cambiar la contraseña correctamente", async () => {
    const response = await request(app)
      .put("/api/auth/cambiar-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        passwordActual: "admin123",
        passwordNueva: "NuevaPass123.",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toContain("actualizada");
  });

  it("debería rechazar password actual incorrecta", async () => {
    const response = await request(app)
      .put("/api/auth/cambiar-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        passwordActual: "incorrecta",
        passwordNueva: "NuevaPass123.",
      });

    expect(response.statusCode).toBe(401);
  });

  it("debería validar longitud mínima", async () => {
    const response = await request(app)
      .put("/api/auth/cambiar-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        passwordActual: "admin123",
        passwordNueva: "123",
      });

    expect(response.statusCode).toBe(400);
  });
});