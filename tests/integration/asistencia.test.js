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
const { Asistencia, Horario, Matricula } = require("../../models");

// Mockeamos el servicio externo de Guaraní para controlar el período lectivo en los tests de ausencias
const guaraniService = require("../../services/guaraniService");
jest.mock("../../services/guaraniService");

describe("Pruebas del Módulo de Asistencias", () => {
  let token;

  beforeAll(() => {
    token = generarTokenAdmin();
  });

  beforeEach(() => {
    jest.clearAllMocks();
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
  // CONTROLADOR PRINCIPAL (asistenciaController)
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

      const response = await request(app)
        .post("/api/asistencias/registrar-desde-qr")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipoUsuario: "ESTUDIANTE",
          usuarioId: estudiante.dni,
          aulaId: aula.aulaId,
          rtoken: "QR_NATIVO_999"
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain("✅ Asistencia registrada correctamente");
      expect(response.body.data).toHaveProperty("asistenciaId");
    });
  });

  // ============================================================
  // CONSOLIDACIÓN AUTOMÁTICA DE AUSENCIAS
  // ============================================================
  describe("POST /api/asistencias/consolidar-ausentes", () => {
    
    test("debe marcar como AUSENTE solo a los estudiantes que no escanearon el QR", async () => {
      const comision = await crearComision();
      const aula = await crearAula();

      // Mock de Guaraní: Forzamos periodo académico activo para la fecha del FakeTimer (2026-06-01)
      guaraniService.getPeriodosTekoa.mockResolvedValue([
        {
          periodo: "256",
          fecha_inicio_dictado: "2026-03-01",
          fecha_fin_dictado: "2026-07-15"
        }
      ]);

      // Alumnos objetivos para la prueba
      const estudiantePresente = await crearEstudiante();
      const estudianteAusente = await crearEstudiante();

      // Matricular a ambos en la misma comisión
      await crearMatricula({ estudianteDni: estudiantePresente.dni, comisionId: comision.comisionId });
      await crearMatricula({ estudianteDni: estudianteAusente.dni, comisionId: comision.comisionId });

      // Uno de ellos asiste normalmente registrando su PRESENTE de forma temprana
      await Asistencia.create({
        usuarioId: estudiantePresente.dni,
        tipoUsuario: "ESTUDIANTE",
        comisionId: comision.comisionId,
        fecha: "2026-06-01",
        horaRegistro: "18:15",
        estado: "PRESENTE"
      });

      // Se ejecuta el proceso de consolidación invocando al endpoint de tus rutas
      const response = await request(app)
        .post("/api/asistencias/consolidar-ausentes")
        .set("Authorization", `Bearer ${token}`)
        .send({
          comisionId: comision.comisionId,
          fecha: "2026-06-01"
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.creados).toBe(1); // Solo mutó el alumno faltante

      // Verificación en la base de datos relacional
      const asistenciaEstudiante1 = await Asistencia.findOne({
        where: { usuarioId: estudiantePresente.dni, comisionId: comision.comisionId, fecha: "2026-06-01" }
      });
      const asistenciaEstudiante2 = await Asistencia.findOne({
        where: { usuarioId: estudianteAusente.dni, comisionId: comision.comisionId, fecha: "2026-06-01" }
      });

      // El alumno que escaneó sigue intacto
      expect(asistenciaEstudiante1.estado).toBe("PRESENTE");
      
      // El alumno que no asistió pasó a estar ausente con la hora del fake system time
      expect(asistenciaEstudiante2).not.toBeNull();
      expect(asistenciaEstudiante2.estado).toBe("AUSENTE");
      expect(asistenciaEstudiante2.horaRegistro).toBe("19:30:00");
    });

    test("debe retornar 400 si la petición carece de comisionId o fecha", async () => {
      const comision = await crearComision();

      const response = await request(app)
        .post("/api/asistencias/consolidar-ausentes")
        .set("Authorization", `Bearer ${token}`)
        .send({ comisionId: comision.comisionId }); // Falta parámetro fecha

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Faltan campos: comisionId y fecha");
    });
  });
});