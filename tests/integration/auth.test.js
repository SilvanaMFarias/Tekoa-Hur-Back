require("../setup/test-db");

const request = require("supertest");
const bcrypt = require("bcryptjs");

const app = require("../../app");

const { Usuario } = require("../../models");

describe("Auth Integration", () => {

  beforeEach(async () => {

    const passwordHash = await bcrypt.hash(
      "admin123",
      10
    );

    await Usuario.create({
  dni: "12345678",
  nombre: "Administrador Test",
  email: "admin@test.com",
  password: passwordHash,
  rol: "administrador",
  referenciaId: "12345678",
  activo: true,
});

  });

  // ─────────────────────────────────────────────
  // LOGIN OK
  // ─────────────────────────────────────────────

  it("debería loguear correctamente", async () => {

    const response = await request(app)
      .post("/api/auth/login")
      .send({
        dni: "12345678",
        password: "admin123",
      });

    expect(response.statusCode).toBe(200);

    expect(response.body).toHaveProperty("token");

    expect(response.body.usuario).toMatchObject({
      dni: "12345678",
      nombre: "Administrador Test",
      rol: "administrador",
    });

  });

  // ─────────────────────────────────────────────
  // PASSWORD INCORRECTA
  // ─────────────────────────────────────────────

  it("debería rechazar contraseña incorrecta", async () => {

    const response = await request(app)
      .post("/api/auth/login")
      .send({
        dni: "12345678",
        password: "incorrecta",
      });

    expect(response.statusCode).toBe(401);

    expect(response.body.message)
      .toContain("incorrectos");

  });

  // ─────────────────────────────────────────────
  // USUARIO INEXISTENTE
  // ─────────────────────────────────────────────

  it("debería rechazar usuario inexistente", async () => {

    const response = await request(app)
      .post("/api/auth/login")
      .send({
        dni: "99999999",
        password: "admin123",
      });

    expect(response.statusCode).toBe(401);

  });

  // ─────────────────────────────────────────────
  // CAMPOS FALTANTES
  // ─────────────────────────────────────────────

  it("debería validar campos requeridos", async () => {

    const response = await request(app)
      .post("/api/auth/login")
      .send({});

    expect(response.statusCode).toBe(400);

  });

});