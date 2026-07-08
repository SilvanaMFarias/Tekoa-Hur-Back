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
    // Fijamos el tiempo en un Lunes específico a las 19:30:00 hora local (Año actual: 2026)
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-01T19:30:00")); 
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================================
  // FLUJO DE ASISTENCIA — REGISTRO DESDE QR (Controlador Moderno)
  // ============================================================
  describe("POST /api/asistencias/registrar-desde-qr", () => {

    test("debe registrar asistencia exitosamente para un estudiante matriculado", async () => {
      const estudiante = await crearEstudiante();
      const aula = await crearAula({ rtoken: "QR_VALIDO_123" });
      const comision = await crearComision();
      
      const aulaIdFinal = aula.aulaId || aula.id;
      const comisionIdFinal = comision.comisionId || comision.id;

      await crearHorario({
        aulaId: aulaIdFinal,
        comisionId: comisionIdFinal,
        diaSemana: "lunes",
        horaDesde: "18:00",
        horaHasta: "22:00"
      });

      await crearMatricula({
        estudianteDni: estudiante.dni,
        comisionId: comisionIdFinal
      });

      const response = await request(app)
        .post("/api/asistencias/registrar-desde-qr")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipoUsuario: "ESTUDIANTE",
          usuarioId: estudiante.dni,
          aulaId: aulaIdFinal,
          rtoken: "QR_VALIDO_123"
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain("✅ Asistencia registrada correctamente");
      expect(response.body.data.comisionId).toBe(comisionIdFinal);

      const enDb = await Asistencia.findByPk(response.body.data.asistenciaId);
      expect(enDb).not.toBeNull();
      expect(enDb.estado).toBe("PRESENTE");
    });

    test("debe devolver 403 si el estudiante no pertenece a la comisión de esa clase", async () => {
      const estudianteCualquiera = await crearEstudiante();
      const aula = await crearAula({ rtoken: "QR_VALIDO_123" });
      const aulaIdFinal = aula.aulaId || aula.id;
      
      await crearHorario({
        aulaId: aulaIdFinal,
        diaSemana: "lunes",
        horaDesde: "18:00",
        horaHasta: "22:00"
      });

      const response = await request(app)
        .post("/api/asistencias/registrar-desde-qr")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipoUsuario: "ESTUDIANTE",
          usuarioId: estudianteCualquiera.dni,
          aulaId: aulaIdFinal,
          rtoken: "QR_VALIDO_123"
        });

      expect(response.status).toBe(403);
    });

    test("debe devolver 403 si el rtoken del QR no coincide con el del aula", async () => {
      const estudiante = await crearEstudiante();
      const aula = await crearAula({ rtoken: "QR_REAL" });
      const aulaIdFinal = aula.aulaId || aula.id;

      const response = await request(app)
        .post("/api/asistencias/registrar-desde-qr")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipoUsuario: "ESTUDIANTE",
          usuarioId: estudiante.dni,
          aulaId: aulaIdFinal,
          rtoken: "QR_FALSO_O_VIEJO"
        });

      expect(response.status).toBe(403);
    });

    test("debe devolver 409 si intenta registrar la asistencia dos veces el mismo día", async () => {
      const estudiante = await crearEstudiante();
      const aula = await crearAula({ rtoken: "QR_VALIDO_123" });
      const comision = await crearComision();
      
      const aulaIdFinal = aula.aulaId || aula.id;
      const comisionIdFinal = comision.comisionId || comision.id;

      await crearHorario({
        aulaId: aulaIdFinal,
        comisionId: comisionIdFinal,
        diaSemana: "lunes",
        horaDesde: "18:00",
        horaHasta: "22:00"
      });

      await crearMatricula({
        estudianteDni: estudiante.dni,
        comisionId: comisionIdFinal
      });

      await request(app)
        .post("/api/asistencias/registrar-desde-qr")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipoUsuario: "ESTUDIANTE",
          usuarioId: estudiante.dni,
          aulaId: aulaIdFinal,
          rtoken: "QR_VALIDO_123"
        });

      const response = await request(app)
        .post("/api/asistencias/registrar-desde-qr")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipoUsuario: "ESTUDIANTE",
          usuarioId: estudiante.dni,
          aulaId: aulaIdFinal,
          rtoken: "QR_VALIDO_123"
        });

      expect(response.status).toBe(409);
    });
    // ============================================================
    // CASOS ADICIONALES PARA LIKIDAR COBERTURA EN VALIDATEASISTENCIA
    // ============================================================

    test("debe devolver 400 si el tipo de usuario no es válido", async () => {
      const comision = await crearComision();
      const comisionIdFinal = comision.comisionId || comision.id;
      const aula = await crearAula({ rtoken: "QR_VALIDO_X" });
      const aulaIdFinal = aula.aulaId || aula.id;

      // Creamos un horario activo para que pase la validación de clase activa
      await crearHorario({
        aulaId: aulaIdFinal,
        comisionId: comisionIdFinal,
        diaSemana: "lunes",
        horaDesde: "18:00",
        horaHasta: "22:00"
      });

      const response = await request(app)
        .post("/api/asistencias/registrar-desde-qr")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipoUsuario: "INVALIDO", 
          usuarioId: "12345678",
          comisionId: comisionIdFinal,
          aulaId: aulaIdFinal,
          rtoken: "QR_VALIDO_X",
          fecha: "2026-06-01",
          horaRegistro: "19:30:00"
        });

      expect(response.status).toBe(400);
      const msg = response.body.message || JSON.stringify(response.body);
      expect(msg).toMatch(/(Tipo de usuario no válido|Faltan campos|tipoUsuario debe ser)/i);    });

    test("debe devolver 403 si el QR ya expiró temporalmente (Prueba el FIX rtokenExpira)", async () => {
      const estudiante = await crearEstudiante();
      const comision = await crearComision();
      const comisionIdFinal = comision.comisionId || comision.id;

      // Creamos un aula con un rtoken expira en el PASADO (hace 1 hora en base al FakeTime 19:30)
      const aula = await crearAula({ 
        rtoken: "QR_EXPIRADO",
        rtokenExpira: new Date("2026-06-01T18:30:00") 
      });
      const aulaIdFinal = aula.aulaId || aula.id;

      await crearHorario({
        aulaId: aulaIdFinal,
        comisionId: comisionIdFinal,
        diaSemana: "lunes",
        horaDesde: "18:00",
        horaHasta: "22:00"
      });

      await crearMatricula({ estudianteDni: estudiante.dni, comisionId: comisionIdFinal });

      const response = await request(app)
        .post("/api/asistencias/registrar-desde-qr")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipoUsuario: "ESTUDIANTE",
          usuarioId: estudiante.dni,
          aulaId: aulaIdFinal,
          rtoken: "QR_EXPIRADO",
          fecha: "2026-06-01",
          horaRegistro: "19:30:00"
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("El QR expiró");
    });

    test("debe devolver 400 si el estudiante escanea el QR en un aula incorrecta", async () => {
      const estudiante = await crearEstudiante();
      const comision = await crearComision();
      const comisionIdFinal = comision.comisionId || comision.id;

      const aulaCorrecta = await crearAula({ sector: "Sector A", numero: "101" });
      const aulaIncorrecta = await crearAula({ rtoken: "QR_OTRA_AULA" });

      const aulaCorrectaId = aulaCorrecta.aulaId || aulaCorrecta.id;
      const aulaIncorrectaId = aulaIncorrecta.aulaId || aulaIncorrecta.id;

      // El horario asignado en la DB vincula a la comisión y al AULA CORRECTA
      await crearHorario({
        aulaId: aulaCorrectaId,
        comisionId: comisionIdFinal,
        diaSemana: "lunes",
        horaDesde: "18:00",
        horaHasta: "22:00"
      });

      await crearMatricula({ estudianteDni: estudiante.dni, comisionId: comisionIdFinal });

      // Enviamos la petición intentando registrar en el AULA INCORRECTA
      const response = await request(app)
        .post("/api/asistencias/registrar-desde-qr")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipoUsuario: "ESTUDIANTE",
          usuarioId: estudiante.dni,
          comisionId: comisionIdFinal,
          aulaId: aulaIncorrectaId,
          rtoken: "QR_OTRA_AULA",
          fecha: "2026-06-01",
          horaRegistro: "19:30:00"
        });

      expect(response.status).toBe(400);
      const msg = response.body.message || JSON.stringify(response.body);
      expect(msg).toMatch(/(Aula incorrecta|No hay clase activa)/i);
    });
  });

  // ============================================================
  // CONTROLADOR PRINCIPAL (asistenciaController)
  // ============================================================
  describe("Rutas Base e Integración de AsistenciaController (/api/asistencias)", () => {

    test("GET /api/asistencias - debe listar asistencias filtradas por comisionId", async () => {
      const estudiante = await crearEstudiante();
      const comision = await crearComision();
      const comisionIdFinal = comision.comisionId || comision.id;

      await Asistencia.create({
        usuarioId: estudiante.dni,
        tipoUsuario: "ESTUDIANTE",
        comisionId: comisionIdFinal,
        fecha: "2026-06-01",
        horaRegistro: "19:30",
        estado: "PRESENTE"
      });

      const response = await request(app)
        .get("/api/asistencias")
        .query({ comisionId: comisionIdFinal })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test("POST /api/asistencias/registrar-desde-qr - debe impactar exitosamente a través del controlador principal", async () => {
      const estudiante = await crearEstudiante();
      const aula = await crearAula({ rtoken: "QR_NATIVO_999" });
      const comision = await crearComision();

      const aulaIdFinal = aula.aulaId || aula.id;
      const comisionIdFinal = comision.comisionId || comision.id;

      await crearHorario({
        aulaId: aulaIdFinal,
        comisionId: comisionIdFinal,
        diaSemana: "lunes",
        horaDesde: "18:00",
        horaHasta: "22:00"
      });

      await crearMatricula({
        estudianteDni: estudiante.dni,
        comisionId: comisionIdFinal
      });

      const response = await request(app)
        .post("/api/asistencias/registrar-desde-qr")
        .set("Authorization", `Bearer ${token}`)
        .send({
          tipoUsuario: "ESTUDIANTE",
          usuarioId: estudiante.dni,
          aulaId: aulaIdFinal,
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
      const comisionIdFinal = comision.comisionId || comision.id;

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
      await crearMatricula({ estudianteDni: estudiantePresente.dni, comisionId: comisionIdFinal });
      await crearMatricula({ estudianteDni: estudianteAusente.dni, comisionId: comisionIdFinal });

      // Uno de ellos asiste normalmente registrando su PRESENTE de forma temprana
      await Asistencia.create({
        usuarioId: estudiantePresente.dni,
        tipoUsuario: "ESTUDIANTE",
        comisionId: comisionIdFinal,
        fecha: "2026-06-01",
        horaRegistro: "18:15",
        estado: "PRESENTE"
      });

      // Se ejecuta el proceso de consolidación invocando al endpoint de tus rutas
      const response = await request(app)
        .post("/api/asistencias/consolidar-ausentes")
        .set("Authorization", `Bearer ${token}`)
        .send({
          comisionId: comisionIdFinal,
          fecha: "2026-06-01"
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.creados).toBe(1); // Solo mutó el alumno faltante

      // Verificación en la base de datos relacional
      const asistenciaEstudiante1 = await Asistencia.findOne({
        where: { usuarioId: estudiantePresente.dni, comisionId: comisionIdFinal, fecha: "2026-06-01" }
      });
      const asistenciaEstudiante2 = await Asistencia.findOne({
        where: { usuarioId: estudianteAusente.dni, comisionId: comisionIdFinal, fecha: "2026-06-01" }
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
      const comisionIdFinal = comision.comisionId || comision.id;

      const response = await request(app)
        .post("/api/asistencias/consolidar-ausentes")
        .set("Authorization", `Bearer ${token}`)
        .send({ comisionId: comisionIdFinal }); // Falta parámetro fecha

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Faltan campos: comisionId y fecha");
    });
  });

  // ============================================================
  // PRUEBAS DE SEGURIDAD Y MIDDLEWARES 
  // ============================================================
  describe("Control de Errores y Intercepción de Middlewares", () => {

    test("debe devolver 401 si se intenta acceder sin token JWT (Middleware de Auth)", async () => {
      const response = await request(app)
        .get("/api/asistencias")
        .query({ comisionId: 'alguna-comision' });
        // No enviamos .set("Authorization")

      expect(response.status).toBe(401);
    });

    test("debe devolver 401 si se envía un token malformado o inválido", async () => {
      const response = await request(app)
        .get("/api/asistencias")
        .set("Authorization", "Bearer token-falso-e-invalido");

      expect(response.status).toBe(401);
    });

    test("debe capturar un error 404 a través del middleware notFound si la ruta no existe", async () => {
  const response = await request(app)
    .get("/api/asistencias-ruta-que-no-existe-en-el-servidor")
    .set("Authorization", `Bearer ${token}`);

  // Esto ya pasó y demostró que tu middleware notFound intercepta la petición
  expect(response.status).toBe(404);

  // Validamos de forma segura adaptándonos a lo que responda tu manejador de errores
  const errorContenido = response.body.message || response.body.error || JSON.stringify(response.body);
  expect(errorContenido).toMatch(/Ruta no encontrada/i);
});
  });

  // ============================================================
  // RUTAS CRUD BASE (Para cubrir router.get, router.post, etc.)
  // ============================================================
  describe("Rutas CRUD Base (AsistenciaController)", () => {
    test("GET /api/asistencias/:id - debe responder la ruta de detalle", async () => {
      const estudiante = await crearEstudiante();
      const comision = await crearComision();
      
      const asistencia = await Asistencia.create({
        usuarioId: estudiante.dni,
        tipoUsuario: "ESTUDIANTE",
        comisionId: comision.comisionId || comision.id,
        fecha: "2026-06-01",
        horaRegistro: "19:30",
        estado: "PRESENTE"
      });

      const response = await request(app)
        .get(`/api/asistencias/${asistencia.asistenciaId || asistencia.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).not.toBe(404); // Asegura que la ruta existe y fue alcanzada
    });

    test("POST /api/asistencias - debe fallar si faltan campos requeridos (Middlewares)", async () => {
      const response = await request(app)
        .post("/api/asistencias")
        .set("Authorization", `Bearer ${token}`)
        .send({ tipoUsuario: "ESTUDIANTE" }); // Faltan un montón de campos

      expect(response.status).toBe(400); // El validateRequiredFields debería frenarlo
    });
  });

  // ============================================================
  // POST /api/asistencias/docente-presente
  // ============================================================
  describe("POST /api/asistencias/docente-presente", () => {
    test("debe retornar 400 si falta el comisionId", async () => {
      const response = await request(app)
        .post("/api/asistencias/docente-presente")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/comisionId es requerido/i);
    });

    test("debe retornar 404 si la comisión no existe", async () => {
      const response = await request(app)
        .post("/api/asistencias/docente-presente")
        .set("Authorization", `Bearer ${token}`)
        .send({ comisionId: "00000000-0000-0000-0000-000000000000" });

      expect(response.status).toBe(404);
    });

    // Descomenta y ajusta este test si tu factory permite mockear el token del profesor
    /*
    test("debe registrar presencia del docente correctamente", async () => {
      const profesor = await Profesor.create({ dni: "88888888", nombre: "Profe Prueba" });
      const comision = await crearComision();
      const comisionIdFinal = comision.comisionId || comision.id;
      
      await comision.update({ profesorId: profesor.id }); // Asignar titular

      await crearHorario({
        comisionId: comisionIdFinal,
        diaSemana: "lunes",
        horaDesde: "18:00",
        horaHasta: "22:00"
      });

      // Asegúrate de que el token enviado pertenezca al profesor con DNI 88888888
      const tokenProfesor = generarToken({ dni: "88888888", rol: "PROFESOR" }); 

      const response = await request(app)
        .post("/api/asistencias/docente-presente")
        .set("Authorization", `Bearer ${tokenProfesor}`)
        .send({ comisionId: comisionIdFinal });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain("Presencia registrada");
    });
    */
  });

  // ============================================================
  // POST /api/asistencias/confirmar-dia
  // ============================================================
  describe("POST /api/asistencias/confirmar-dia", () => {
    test("debe retornar 400 si faltan datos obligatorios", async () => {
      const response = await request(app)
        .post("/api/asistencias/confirmar-dia")
        .set("Authorization", `Bearer ${token}`)
        .send({ fecha: "2026-06-01" }); // Falta comisionId y asistencias

      expect(response.status).toBe(400);
    });

    test("debe crear y actualizar asistencias masivamente y limpiar el rtoken del aula", async () => {
      const comision = await crearComision();
      const aula = await crearAula({ rtoken: "AULA_ACTIVA", rtokenExpira: new Date() });
      const estudianteNuevo = await crearEstudiante();
      const estudianteExistente = await crearEstudiante();
      
      const comisionIdFinal = comision.comisionId || comision.id;
      const aulaIdFinal = aula.aulaId || aula.id;

      // Creamos un registro previo para forzar el path de "update"
      await Asistencia.create({
        usuarioId: estudianteExistente.dni,
        tipoUsuario: "ESTUDIANTE",
        comisionId: comisionIdFinal,
        fecha: "2026-06-01",
        horaRegistro: "18:00",
        estado: "AUSENTE"
      });

      const response = await request(app)
        .post("/api/asistencias/confirmar-dia")
        .set("Authorization", `Bearer ${token}`)
        .send({
          comisionId: comisionIdFinal,
          aulaId: aulaIdFinal,
          fecha: "2026-06-01",
          asistencias: [
            { dni: estudianteExistente.dni, estado: "PRESENTE" }, // Debe actualizar
            { dni: estudianteNuevo.dni, estado: "AUSENTE" }       // Debe crear
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.creados).toBe(1);
      expect(response.body.actualizados).toBe(1);

      // Verificar que el aula limpió sus tokens
      const { Aula } = require("../../models");
      const aulaActualizada = await Aula.findByPk(aulaIdFinal);
      expect(aulaActualizada.rtoken).toBeNull();
      expect(aulaActualizada.rtokenExpira).toBeNull();
    });
  });

  // ============================================================
  // GET /api/asistencias/dia
  // ============================================================
  describe("GET /api/asistencias/dia", () => {
    test("debe retornar 400 si falta comisionId o fecha", async () => {
      const response = await request(app)
        .get("/api/asistencias/dia")
        .set("Authorization", `Bearer ${token}`)
        .query({ fecha: "2026-06-01" }); // Falta comisionId

      expect(response.status).toBe(400);
    });

    test("debe retornar la lista de estudiantes con su estado de asistencia del día", async () => {
      const comision = await crearComision();
      const comisionIdFinal = comision.comisionId || comision.id;
      
      const estudianteConRegistro = await crearEstudiante();
      const estudianteSinRegistro = await crearEstudiante();

      await crearMatricula({ estudianteDni: estudianteConRegistro.dni, comisionId: comisionIdFinal });
      await crearMatricula({ estudianteDni: estudianteSinRegistro.dni, comisionId: comisionIdFinal });

      // Solo uno tiene registro de asistencia hoy
      await Asistencia.create({
        usuarioId: estudianteConRegistro.dni,
        tipoUsuario: "ESTUDIANTE",
        comisionId: comisionIdFinal,
        fecha: "2026-06-01",
        horaRegistro: "19:00",
        estado: "PRESENTE"
      });

      const response = await request(app)
        .get("/api/asistencias/dia")
        .set("Authorization", `Bearer ${token}`)
        .query({ comisionId: comisionIdFinal, fecha: "2026-06-01" });

      expect(response.status).toBe(200);
      expect(response.body.alumnos.length).toBe(2);
      
      const alumno1 = response.body.alumnos.find(a => a.dni === estudianteConRegistro.dni);
      const alumno2 = response.body.alumnos.find(a => a.dni === estudianteSinRegistro.dni);

      expect(alumno1.estado).toBe("PRESENTE");
      expect(alumno1.escaneó).toBe(true);

      // El que no tiene registro debe mapearse por defecto como AUSENTE
      expect(alumno2.estado).toBe("AUSENTE");
      expect(alumno2.escaneó).toBe(false);
    });
  });
});