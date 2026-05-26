require("../setup/test-db");

const request = require("supertest");
const bcrypt = require("bcryptjs");

const app = require("../../app");

const { Usuario } = require("../../models");

describe("GET /api/auth/me", () => {

  let token;

  beforeEach(async () => {

    const passwordHash = await bcrypt.hash(
      "NuevaPass123.",
      10
    );

    const usuario = await Usuario.create({
      dni: "12345678",
      nombre: "Administrador Test",
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
        password: "NuevaPass123.",
      });

    token = loginResponse.body.token;

  });

  // ─────────────────────────────────────────────
  // TOKEN VÁLIDO
  // ─────────────────────────────────────────────

  it("debería devolver el usuario autenticado", async () => {

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    expect(response.body).toMatchObject({
      dni: "12345678",
      nombre: "Administrador Test",
      rol: "administrador",
    });

  });

  // ─────────────────────────────────────────────
  // SIN TOKEN
  // ─────────────────────────────────────────────

  it("debería rechazar si no hay token", async () => {

    const response = await request(app)
      .get("/api/auth/me");

    expect(response.statusCode).toBe(401);

  });

  // ─────────────────────────────────────────────
  // TOKEN INVÁLIDO
  // ─────────────────────────────────────────────

  it("debería rechazar token inválido", async () => {

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer token-falso");

    expect(response.statusCode).toBe(401);

  });

});