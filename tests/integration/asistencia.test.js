require("../setup/test-db");
const request = require("supertest");
const app = require("../../app");
const { generarTokenAdmin } = require("../setup/auth");
const { 
  crearComision, 
  crearEstudiante, 
  crearAsistencia, 
  crearAula, 
  crearHorario, 
  crearMatricula 
} = require("../setup/factories");
const { Asistencia } = require("../../models");

describe("Pruebas del Módulo de Asistencias", () => {
  let token;

  beforeAll(() => {
    token = generarTokenAdmin();
  });

  beforeEach(() => {
    // ⏰ Fijamos el tiempo en un Lunes específico a las 19:30:00 hora local
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-01T19:30:00")); 
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================================
  // LÓGICA LEGACY / QR COMPARTIDO
  // ============================================================
  describe("POST /api/asistencia/registrar-qr", () => {

    test("debe registrar asistencia exitosamente para un estudiante matriculado", async () => {
      const estudiante = await crearEstudiante();
      const aula = await crearAula({ rtoken: "QR_VALIDO_123" });
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
        .post("/api/qr/registrar")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipoUsuario: "ESTUDIANTE",
          usuarioId: estudiante.dni,
          aulaId: aula.aulaId,
          rtoken: "QR_VALIDO_123"
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain("✅ Asistencia registrada");
      expect(response.body.data.comisionId).toBe(comision.comisionId);

      const enDb = await Asistencia.findByPk(response.body.data.asistenciaId);
      expect(enDb).not.toBeNull();
      expect(enDb.estado).toBe("PRESENTE");
    });

    test("debe devolver 403 si el estudiante no pertenece a la comisión de esa clase", async () => {
      const estudianteCualquiera = await crearEstudiante();
      const aula = await crearAula({ rtoken: "QR_VALIDO_123" });
      
      await crearHorario({
        aulaId: aula.aulaId,
        diaSemana: "lunes",
        horaDesde: "18:00",
        horaHasta: "22:00"
      });

      const response = await request(app)
        .post("/api/qr/registrar")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipoUsuario: "ESTUDIANTE",
          usuarioId: estudianteCualquiera.dni,
          aulaId: aula.aulaId,
          rtoken: "QR_VALIDO_123"
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("No estás matriculado en esta comisión");
    });

    test("debe devolver 403 si el rtoken del QR no coincide con el del aula", async () => {
      const estudiante = await crearEstudiante();
      const aula = await crearAula({ rtoken: "QR_REAL" });

      const response = await request(app)
        .post("/api/qr/registrar")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipoUsuario: "ESTUDIANTE",
          usuarioId: estudiante.dni,
          aulaId: aula.aulaId,
          rtoken: "QR_FALSO_O_VIEJO"
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("QR inválido o expirado");
    });

    test("debe devolver 409 si intenta registrar la asistencia dos veces el mismo día", async () => {
      const estudiante = await crearEstudiante();
      const aula = await crearAula({ rtoken: "QR_VALIDO_123" });
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

      await request(app)
        .post("/api/qr/registrar")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipoUsuario: "ESTUDIANTE",
          usuarioId: estudiante.dni,
          aulaId: aula.aulaId,
          rtoken: "QR_VALIDO_123"
        });

      const response = await request(app)
        .post("/api/qr/registrar")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipoUsuario: "ESTUDIANTE",
          usuarioId: estudiante.dni,
          aulaId: aula.aulaId,
          rtoken: "QR_VALIDO_123"
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain("Ya registraste tu asistencia hoy");
    });
  });

  // ============================================================
  // NUEVAS PRUEBAS: CONTROLADOR PRINCIPAL (asistenciaController)
  // ============================================================
  describe("Rutas Base e Integración de AsistenciaController (/api/asistencias)", () => {

    test("GET /api/asistencias - debe listar asistencias filtradas por comisionId", async () => {
      const estudiante = await crearEstudiante();
      const comision = await crearComision();

      // Forzamos un registro previo en la base de datos
      await Asistencia.create({
        usuarioId: estudiante.dni,
        tipoUsuario: "ESTUDIANTE",
        comisionId: comision.comisionId,
        fecha: "2026-06-01",
        horaRegistro: "19:30",
        estado: "PRESENTE"
      });

      const response = await request(app)
        .get("/api/asistencias")
        .query({ comisionId: comision.comisionId })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test("POST /api/asistencias/registrar-desde-qr - debe impactar exitosamente a través del controlador principal", async () => {
      const estudiante = await crearEstudiante();
      const aula = await crearAula({ rtoken: "QR_NATIVO_999" });
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

      // Le pegamos al endpoint que mapea directamente al método "registrarDesdeQR" de asistenciaController
      const response = await request(app)
        .post("/api/asistencias/registrar-desde-qr")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipoUsuario: "ESTUDIANTE",
          usuarioId: estudiante.dni,
          aulaId: aula.aulaId,
          rtoken: "QR_NATIVO_999"
        });

      // Verificamos que devuelva 210 o 201 según lo definido en asistenciaController.js
      expect(response.status).toBe(201);
      expect(response.body.message).toContain("✅ Asistencia registrada correctamente");
      expect(response.body.data).toHaveProperty("asistenciaId");
    });
  });
});