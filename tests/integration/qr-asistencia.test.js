require("../setup/test-db");
const request = require("supertest");
const app = require("../../app");
const { generarTokenAdmin } = require("../setup/auth"); // Asumo que tenés o podés armar un generarTokenDocente
const { 
  crearComision, 
  crearEstudiante, 
  crearProfesor,
  crearHorario, 
  crearMatricula 
} = require("../setup/factories");
const { Asistencia, Comision } = require("../../models");

describe("QrAsistenciaController (/api/qr/asistencia)", () => {
  let tokenAdmin;
  const fechaFija = "2026-06-01T19:30:00"; // Un lunes a las 19:30

  beforeAll(() => {
    tokenAdmin = generarTokenAdmin();
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(fechaFija)); 
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── GENERAR QR ─────────────────────────────────────────────────────────────
  describe("POST /api/qr/asistencia/generar", () => {
    test("debe permitir al admin generar el QR saltándose validación de titularidad", async () => {
      const comision = await crearComision();

      const response = await request(app)
        .post("/api/qr/asistencia/generar")
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .send({ comisionId: comision.comisionId, duracionMinutos: 15 });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("QR de asistencia generado");
      expect(response.body).toHaveProperty("qrToken");
      
      // Comprobamos la rotación en la DB
      const comisionDb = await Comision.findByPk(comision.comisionId);
      expect(comisionDb.qrToken).toBe(response.body.qrToken);
    });

    test("debe rechazar si un docente intenta generar un QR para una comisión que no es suya", async () => {
      const profesorTitular = await crearProfesor();
      const comision = await crearComision({ profesorId: profesorTitular.profesorId });
      
      // Simulamos el token de un docente ajeno (DNI trucho)
      const jwtDocenteAjeno = require("jsonwebtoken").sign(
        { dni: "99999999", rol: "docente" }, 
        process.env.JWT_SECRET || "secret"
      );

      const response = await request(app)
        .post("/api/qr/asistencia/generar")
        .set("Authorization", `Bearer ${jwtDocenteAjeno}`)
        .send({ comisionId: comision.comisionId });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("Solo el docente titular puede generar el QR");
    });

    test("debe devolver 400 si falta el comisionId", async () => {
      const response = await request(app)
        .post("/api/qr/asistencia/generar")
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .send({ duracionMinutos: 60 });

      expect(response.status).toBe(400);
    });
  });

  // ── VALIDAR QR ─────────────────────────────────────────────────────────────
  describe("GET /api/qr/asistencia/validar", () => {
    test("debe retornar la información pública de la comisión si el token es válido", async () => {
      const tokenValido = "token_valido_estructura_nueva";
      const comision = await crearComision({
        qrToken: tokenValido,
        qrTokenExpira: new Date(Date.now() + 30 * 60 * 1000) // Vence en 30 min
      });

      const response = await request(app)
        .get("/api/qr/asistencia/validar")
        .query({ qrToken: tokenValido });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.comision.comisionId).toBe(comision.comisionId);
    });

    test("debe rechazar con 403 y limpiar el token de la DB si el QR está expirado", async () => {
      const tokenExpirado = "token_viejo_expirado";
      const comision = await crearComision({
        qrToken: tokenExpirado,
        qrTokenExpira: new Date(Date.now() - 5 * 60 * 1000) // Expiró hace 5 min
      });

      const response = await request(app)
        .get("/api/qr/asistencia/validar")
        .query({ qrToken: tokenExpirado });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("El QR expiró");

      // Verificamos que el service ejecutó la limpieza automática (Set NULL)
      const comisionDb = await Comision.findByPk(comision.comisionId);
      expect(comisionDb.qrToken).toBeNull();
    });
  });

  // ── REGISTRAR ASISTENCIA ───────────────────────────────────────────────────
  describe("POST /api/qr/asistencia/registrar", () => {
    let estudiante, comision, tokenVigente;

    beforeEach(async () => {
      estudiante = await crearEstudiante();
      tokenVigente = "token_flujo_asistencia";
      
      comision = await crearComision({
        qrToken: tokenVigente,
        qrTokenExpira: new Date(Date.now() + 60 * 60 * 1000)
      });

      await crearMatricula({
        estudianteDni: estudiante.dni,
        comisionId: comision.comisionId
      });
    });

    test("debe registrar exitosamente la asistencia si cumple todas las condiciones", async () => {
      // Creamos el horario activo para hoy lunes (19:30 cae adentro)
      await crearHorario({
        comisionId: comision.comisionId,
        diaSemana: "lunes",
        horaDesde: "18:00",
        horaHasta: "22:00"
      });

      const response = await request(app)
        .post("/api/qr/asistencia/registrar")
        .send({
          qrToken: tokenVigente,
          tipoUsuario: "ESTUDIANTE",
          usuarioId: estudiante.dni
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("✅ Asistencia registrada");
      
      const enDb = await Asistencia.findOne({ where: { usuarioId: estudiante.dni } });
      expect(enDb).not.toBeNull();
      expect(enDb.estado).toBe("PRESENTE");
    });

    test("debe rechazar con 400 si el escaneo se hace fuera del horario de clase", async () => {
      // Creamos un horario de clase para los martes (hoy es lunes según nuestro mock de tiempo)
      await crearHorario({
        comisionId: comision.comisionId,
        diaSemana: "martes",
        horaDesde: "18:00",
        horaHasta: "22:00"
      });

      const response = await request(app)
        .post("/api/qr/asistencia/registrar")
        .send({
          qrToken: tokenVigente,
          tipoUsuario: "ESTUDIANTE",
          usuarioId: estudiante.dni
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("No hay clase activa");
    });

    test("debe rechazar con 403 si el estudiante no está matriculado en la comisión", async () => {
      await crearHorario({
        comisionId: comision.comisionId,
        diaSemana: "lunes",
        horaDesde: "18:00",
        horaHasta: "22:00"
      });

      const estudianteInfiltrado = await crearEstudiante();

      const response = await request(app)
        .post("/api/qr/asistencia/registrar")
        .send({
          qrToken: tokenVigente,
          tipoUsuario: "ESTUDIANTE",
          usuarioId: estudianteInfiltrado.dni // No tiene matrícula en esta comisión
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("No pertenecés a esta comisión");
    });

    test("debe rechazar con 409 si intenta registrar doble asistencia el mismo día", async () => {
      await crearHorario({
        comisionId: comision.comisionId,
        diaSemana: "lunes",
        horaDesde: "18:00",
        horaHasta: "22:00"
      });

      // Primer registro exitoso
      await request(app)
        .post("/api/qr/asistencia/registrar")
        .send({ qrToken: tokenVigente, tipoUsuario: "ESTUDIANTE", usuarioId: estudiante.dni });

      // Segundo intento idéntico en el mismo día
      const response = await request(app)
        .post("/api/qr/asistencia/registrar")
        .send({ qrToken: tokenVigente, tipoUsuario: "ESTUDIANTE", usuarioId: estudiante.dni });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe("Ya registraste tu asistencia hoy");
    });
  });
});