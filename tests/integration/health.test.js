require("../setup/test-db");

const request = require("supertest");

const app = require("../../app");

describe("Health Check", () => {

  it("debería responder OK", async () => {

    const response = await request(app)
      .get("/");

    expect(response.statusCode).toBe(200);

    expect(response.text)
      .toContain("Servidor iniciado");

  });

});