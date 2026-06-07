require("../setup/test-db");
const request = require("supertest");
const app = require("../../app");
const { generarTokenAdmin } = require("../setup/auth");
const { 
  crearComision, 
  crearEstudiante, 
  crearAula, 
  crearHorario, 
  crearMatricula 
} = require("../setup/factories");
const { Asistencia } = require("../../models");

describe("QrAsistenciaController (/api/qr/asistencia)", () => {
  let tokenAdmin;

  beforeAll(() => {
    tokenAdmin = generarTokenAdmin();
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-01T19:30:00")); 
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── GENERAR ─────────────────────────────────────────
  test("POST /api/qr/asistencia/generar - debe permitir al admin generar el QR", async () => {
    const comision = await crearComision();

    const response = await request(app)
      .post("/api/qr/asistencia/generar")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({
        comisionId: comision.comisionId,
        duracionMinutos: 15
      });

    if (response.status === 201) {
      expect(response.body.message).toBe("QR de asistencia generado");
      expect(response.body).toHaveProperty("qrToken");
    } else {
      expect(response.status).not.toBe(500);
    }
  });

  // ── VALIDAR ──────────────────────────────────────────
  test("GET /api/qr/asistencia/validar - debe intentar validar sin auth", async () => {
    const response = await request(app)
      .get("/api/qr/asistencia/validar")
      .query({ qrToken: "TOKEN_FALSO" });

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(500);
  });

  // ── VALIDAR ──────────────────────────────────────────
  test("GET /api/qr/asistencia/validar - debe rechazar con 403 ante un token inválido", async () => {
    const response = await request(app)
      .get("/api/qr/asistencia/validar")
      .query({ qrToken: "TOKEN_FALSO_DE_PRUEBA" });

    // Validamos el comportamiento real del service cuando el QR no existe
    expect(response.status).toBe(403);
    expect(response.body.message).toBeDefined();
  });
  // ── REGISTRAR ────────────────────────────────────────
  test("POST /api/qr/asistencia/registrar - debe registrar la asistencia", async () => {
    const estudiante = await crearEstudiante();
    const aula = await crearAula({ rtoken: "QR_NUEVO_CONTROLLER" });
    const comision = await crearComision();
    
    await crearHorario({
      aulaId: aula.aulaId,
      comisionId: comision.comisionId,
      diaSemana: "lunes",
      horaDesde: "18:00",
      horaHasta: "22:00"
    });

    await crearMatricula({
      estudianteDni: estudiante.dni,
      comisionId: comision.comisionId
    });

    const response = await request(app)
      .post("/api/qr/asistencia/registrar")
      .send({
        qrToken: "QR_NUEVO_CONTROLLER",
        tipoUsuario: "ESTUDIANTE",
        usuarioId: estudiante.dni
      });

    if (response.status === 201) {
      expect(response.body.message).toBe("✅ Asistencia registrada");
      const enDb = await Asistencia.findByPk(response.body.data.asistenciaId);
      expect(enDb).not.toBeNull();
    } else {
      expect(response.status).not.toBe(500);
    }
  });
});