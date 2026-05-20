require("../setup/test-db");

const request = require("supertest");
const bcrypt = require("bcryptjs");

const app = require("../../app");
const { Usuario } = require("../../models");

describe("POST /api/auth/usuarios/:id/reset", () => {

  let adminToken;
  let usuario;

  beforeEach(async () => {

    const passwordHash = await bcrypt.hash(
      "admin123",
      10
    );

    await Usuario.create({
      dni: "11111111",
      nombre: "Admin",
      email: "admin@test.com",
      password: passwordHash,
      rol: "administrador",
      referenciaId: "11111111",
      activo: true,
    });

    usuario = await Usuario.create({
      dni: "22222222",
      nombre: "Alumno",
      email: "alumno@test.com",
      password: passwordHash,
      rol: "alumno",
      referenciaId: "22222222",
      activo: true,
    });

    const login = await request(app)
      .post("/api/auth/login")
      .send({
        dni: "11111111",
        password: "admin123",
      });

    adminToken = login.body.token;

  });

  it("debería resetear password", async () => {

    const response = await request(app)
      .post(`/api/auth/usuarios/${usuario.usuarioId}/reset`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.message)
      .toContain("reseteada");

  });

  it("debería devolver 404 si usuario no existe", async () => {

    const response = await request(app)
      .post("/api/auth/usuarios/00000000-0000-0000-0000-000000000000/reset")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(404);

  });

});