require("../setup/test-db");

const request = require("supertest");
const app = require("../../app");
const { Usuario } = require("../../models");
const { crearUsuario } = require("../setup/factories"); // Importamos tu factory corregido

describe("GET /api/auth/me", () => {
  let token;

  beforeEach(async () => {
    // 1. Limpieza preventiva de usuarios para evitar fallos de DNI duplicado
    await Usuario.destroy({ where: {}, cascade: true, force: true });

    // 2. Creamos el administrador usando la factory
    await crearUsuario({
      dni: "12345678",
      nombre: "Administrador Test",
      password: "NuevaPass123.", // La factory ahora la encripta correctamente al final
      rol: "administrador",
    });

    // 3. Autenticación real a través de la API
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