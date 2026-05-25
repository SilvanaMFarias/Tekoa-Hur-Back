require("../setup/test-db");

const request = require("supertest");
const bcrypt = require("bcryptjs");

const app = require("../../app");
const { Usuario } = require("../../models");

describe("PUT /api/auth/cambiar-password", () => {

  let token;

  beforeEach(async () => {

    const passwordHash = await bcrypt.hash(
      "admin123",
      10
    );

    await Usuario.create({
      dni: "12345678",
      nombre: "Admin Test",
      email: "admin@test.com",
      password: passwordHash,
      rol: "administrador",
      referenciaId: "12345678",
      activo: true,
    });

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

    expect(response.body.message)
      .toContain("actualizada");

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