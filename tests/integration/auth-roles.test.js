require("../setup/test-db");

const request = require("supertest");
const bcrypt = require("bcryptjs");

const app = require("../../app");
const { Usuario } = require("../../models");

describe("Roles y permisos", () => {

  let adminToken;
  let alumnoToken;

  beforeEach(async () => {

    const passwordHash = await bcrypt.hash(
      "123456",
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

    await Usuario.create({
      dni: "22222222",
      nombre: "Alumno",
      email: "alumno@test.com",
      password: passwordHash,
      rol: "alumno",
      referenciaId: "22222222",
      activo: true,
    });

    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({
        dni: "11111111",
        password: "123456",
      });

    adminToken = adminLogin.body.token;

    const alumnoLogin = await request(app)
      .post("/api/auth/login")
      .send({
        dni: "22222222",
        password: "123456",
      });

    alumnoToken = alumnoLogin.body.token;

  });

  it("admin debería acceder a usuarios", async () => {

    const response = await request(app)
      .get("/api/auth/usuarios")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);

  });

  it("alumno NO debería acceder a usuarios", async () => {

    const response = await request(app)
      .get("/api/auth/usuarios")
      .set("Authorization", `Bearer ${alumnoToken}`);

    expect(response.statusCode).toBe(403);

  });

  it("sin token debería rechazar", async () => {

    const response = await request(app)
      .get("/api/auth/usuarios");

    expect(response.statusCode).toBe(401);

  });

});