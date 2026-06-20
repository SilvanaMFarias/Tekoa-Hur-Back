require("../setup/test-db");
const request = require("supertest");
const app = require("../../app");
const { crearAula } = require("../setup/factories");
const { Aula } = require("../../models");

describe("Pruebas de Integración - Validación de QR Legacy", () => {

  beforeEach(() => {
    jest.useFakeTimers();
    // ⏰ Fijamos el tiempo en una fecha controlada para las pruebas de expiración
    jest.setSystemTime(new Date("2026-06-01T20:00:00"));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // ============================================================
  // GET /api/qr/validar
  // ============================================================
  describe("GET /api/qr/validar", () => {

    test("debe devolver 200 si el edificioId, aulaId y rtoken coinciden y está vigente", async () => {
      // Definimos una expiración de 1 hora a futuro según nuestro FakeTimer (vence a las 21:00)
      const rtokenExpira = new Date("2026-06-01T21:00:00");
      
      const aulaReal = await crearAula({
        rtoken: "QR_LEGACY_VALIDO",
        rtokenExpira
      });

      const response = await request(app)
        .get("/api/qr/validar")
        .query({
          edificioId: aulaReal.edificioId,
          aulaId: aulaReal.aulaId,
          rtoken: "QR_LEGACY_VALIDO"
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.message).toContain("QR válido");
    });

    test("debe devolver 403 si el rtoken recibido no coincide con el de la DB", async () => {
      const aulaReal = await crearAula({
        rtoken: "QR_ORIGINAL",
        rtokenExpira: new Date("2026-06-01T21:00:00")
      });

      const response = await request(app)
        .get("/api/qr/validar")
        .query({
          edificioId: aulaReal.edificioId,
          aulaId: aulaReal.aulaId,
          rtoken: "QR_TRUCHO_O_VIEJO"
        });

      expect(response.status).toBe(403);
      expect(response.body.ok).toBe(false);
      expect(response.body.message).toContain("QR inválido o expirado");
    });

    test("debe devolver 403 y limpiar el token en DB si el QR ya expiró por tiempo", async () => {
      // Definimos una expiración que ya pasó (venció a las 19:00, y el FakeTimer está en las 20:00)
      const rtokenExpira = new Date("2026-06-01T19:00:00");

      const aulaReal = await crearAula({
        rtoken: "QR_EXPIRADO",
        rtokenExpira
      });

      const response = await request(app)
        .get("/api/qr/validar")
        .query({
          edificioId: aulaReal.edificioId,
          aulaId: aulaReal.aulaId,
          rtoken: "QR_EXPIRADO"
        });

      expect(response.status).toBe(403);
      expect(response.body.ok).toBe(false);
      expect(response.body.message).toContain("El QR expiró");

      // Verificamos el efecto colateral en la base de datos: el controlador debe haber seteado null
      const aulaMutada = await Aula.findByPk(aulaReal.aulaId);
      expect(aulaMutada.rtoken).toBeNull();
      expect(aulaMutada.rtokenExpira).toBeNull();
    });

    test("debe devolver 403 si el aula no existe o no pertenece al edificio enviado", async () => {
      const aulaReal = await crearAula({
        rtoken: "QR_TEST",
        rtokenExpira: new Date("2026-06-01T21:00:00")
      });

      const response = await request(app)
        .get("/api/qr/validar")
        .query({
          edificioId: "00000000-0000-0000-0000-000000000000", // UUID inexistente o erróneo
          aulaId: aulaReal.aulaId,
          rtoken: "QR_TEST"
        });

      expect(response.status).toBe(403);
      expect(response.body.ok).toBe(false);
    });

    test("debe responder con 500 si ocurre un fallo inesperado en el motor ORM de Sequelize", async () => {
      const spyFindOne = jest.spyOn(Aula, "findOne").mockRejectedValue(
        new Error("Fallo crítico simulado en base de datos")
      );

      const response = await request(app)
        .get("/api/qr/validar")
        .query({
          edificioId: "b8ba9cda-67cd-4b7d-9d41-47120a1fefde",
          aulaId: "b8ba9cda-67cd-4b7d-9d41-47120a1fefde",
          rtoken: "CUALQUIERA"
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toContain("Error interno");
      
      spyFindOne.mockRestore();
    });
  });
});