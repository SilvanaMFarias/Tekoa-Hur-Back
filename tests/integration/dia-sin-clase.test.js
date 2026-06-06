require("../setup/test-db");

const request = require("supertest");

const app = require("../../app");

const { generarTokenAdmin } = require("../setup/auth");

const {
  crearComision,
  crearTipoEvento
} = require("../setup/factories");

const {
  DiaSinClase
} = require("../../models");

describe("POST /api/diaSinClase", () => {

  test("debe devolver 400 cuando faltan datos obligatorios", async () => {

    const token = generarTokenAdmin();

    const response = await request(app)
      .post("/api/diaSinClase")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      message: "Faltan datos obligatorios. Se requiere 'fecha' y 'comisionId'."
    });

  });

  test("debe devolver 401 cuando no se envía token", async () => {

    const response = await request(app)
      .post("/api/diaSinClase")
      .send({});

    expect(response.status).toBe(401);

  });

  test("debe crear un día sin clase", async () => {

    const token = generarTokenAdmin();

    const comision = await crearComision();

    const tipoEvento = await crearTipoEvento();

    const response = await request(app)
      .post("/api/diaSinClase")
      .set("Authorization", `Bearer ${token}`)
      .send({
        fecha: "2026-06-01",
        descripcion: "Paro docente",
        tipoEventoId: tipoEvento.tipoEventoId,
        comisionId: comision.comisionId
      });

    expect(response.status).toBe(201);

    expect(response.body).toHaveProperty(
      "diaSinClaseId"
    );

    expect(response.body.fecha)
      .toBe("2026-06-01");

    const registro = await DiaSinClase.findByPk(
      response.body.diaSinClaseId
    );

    expect(registro).not.toBeNull();

  });

  test("debe devolver 409 si la comisión ya tiene un día sin clase para esa fecha", async () => {

    const token = generarTokenAdmin();

    const comision = await crearComision();

    const tipoEvento = await crearTipoEvento();

    await DiaSinClase.create({
      fecha: "2026-06-01",
      descripcion: "Primer registro",
      tipoEventoId: tipoEvento.tipoEventoId,
      comisionId: comision.comisionId
    });

    const response = await request(app)
      .post("/api/diaSinClase")
      .set("Authorization", `Bearer ${token}`)
      .send({
        fecha: "2026-06-01",
        descripcion: "Segundo registro",
        tipoEventoId: tipoEvento.tipoEventoId,
        comisionId: comision.comisionId
      });

    expect(response.status).toBe(409);

    expect(response.body.message)
      .toContain("ya tiene registrado");

  });

});