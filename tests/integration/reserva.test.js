require("../setup/test-db");
const request = require("supertest");
const app = require("../../app");
const { generarTokenAdmin } = require("../setup/auth");
const { Reserva, Aula, Edificio, Usuario, sequelize } = require("../../models");
const { 
  crearUsuario, // 👈 Importamos la factory de usuario para asociar a las reservas
  crearComision, 
  crearEstudiante, 
  crearAsistencia, 
  crearAula, 
  crearHorario, 
  crearMatricula 
} = require("../setup/factories");

describe("Pruebas del Módulo de Reservas de Aulas (End-to-End)", () => {
  let tokenAdmin;
  let usuarioIdTest; 
  
  // IDs con formato UUID válido para Postgres
  const edificioIdTest = "789e4567-e89b-12d3-a456-426614174789";
  const aulaIdTest     = "123e4567-e89b-12d3-a456-426614174123";
  const reservaIdTest  = "456e4567-e89b-12d3-a456-426614174456";

  beforeAll(async () => {
    tokenAdmin = generarTokenAdmin();
    await sequelize.sync({ alter: true });
 
  });

  beforeEach(async () => {
    try {
      // 1. Limpieza de tablas respetando restricciones FK
      await Reserva.destroy({ where: {}, force: true });
      await Aula.destroy({ where: {}, force: true });
      await Edificio.destroy({ where: {}, force: true });
      await Usuario.destroy({ where: {}, force: true });

      // 2. Configuración de Timers y reloj del sistema
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-07-06T14:30:00.000Z"));

      // 3. Poblado de datos base
      await Edificio.create({
        edificioId: edificioIdTest,
        nombre: "Edificio Central"
      });

      await crearAula({
        aulaId: aulaIdTest,
        edificioId: edificioIdTest,
        nombre: "Aula 101"
      });

      // Generamos el usuario administrador real para asociar a las reservas del test
      const adminReal = await crearUsuario({ rol: "administrador" });
      usuarioIdTest = adminReal.usuarioId;
      
    } catch (error) {
      console.error("❌ ERROR CRÍTICO EN BEFOREEACH:", error);
      throw error;
    }
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  // ============================================================
  // 1) GET /api/reservas
  // ============================================================
  describe("GET /api/reservas", () => {
    test("debe listar las reservas aplicando los filtros de query mapeados correctamente", async () => {
      await Reserva.create({
        reservaId: reservaIdTest,
        aulaId: aulaIdTest,
        usuarioId: usuarioIdTest, // 👈 Solucionado notNull
        motivo: "Examen Regular",
        fechaInicio: new Date("2026-07-12T10:00:00.000Z"),
        fechaFin: new Date("2026-07-12T12:00:00.000Z"),
        estado: "confirmada"
      });

      const response = await request(app)
        .get("/api/reservas")
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .query({
          aulaId: aulaIdTest,
          estado: "confirmada",
          desde: "2026-07-10",
          hasta: "2026-07-15"
        })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0].reservaId).toBe(reservaIdTest);
    });

    test("debe listar sin filtros opcionales si no se envían en la query", async () => {
      await Reserva.create({
        reservaId: reservaIdTest,
        aulaId: aulaIdTest,
        usuarioId: usuarioIdTest, // 👈 Solucionado notNull
        motivo: "Clase Abierta",
        fechaInicio: new Date("2026-07-08T10:00:00.000Z"),
        fechaFin: new Date("2026-07-08T12:00:00.000Z"),
        estado: "confirmada"
      });

      const response = await request(app)
        .get("/api/reservas")
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================
  // 2) GET /api/reservas/ocupacion-global
  // ============================================================
  describe("GET /api/reservas/ocupacion-global", () => {
    test("debe devolver 400 si faltan los parámetros requeridos 'desde' o 'hasta'", async () => {
      await request(app)
        .get("/api/reservas/ocupacion-global")
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .query({ desde: "2026-07-10" })
        .expect(400);
    });

    test("debe obtener la ocupación unificada llamando al service real", async () => {
      await Reserva.create({
        reservaId: reservaIdTest,
        aulaId: aulaIdTest,
        usuarioId: usuarioIdTest, // 👈 Solucionado notNull
        motivo: "Seminario",
        fechaInicio: new Date("2026-07-12T15:00:00.000Z"),
        fechaFin: new Date("2026-07-12T17:00:00.000Z"),
        estado: "confirmada"
      });

      const response = await request(app)
        .get("/api/reservas/ocupacion-global")
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .query({
          desde: "2026-07-10",
          hasta: "2026-07-15",
          edificioId: edificioIdTest
        })
        .expect(200);

      expect(response.body).toHaveProperty("aulas");
      expect(response.body).toHaveProperty("eventos");
    });
  });

  // ============================================================
  // 3) GET /api/reservas/:reservaId
  // ============================================================
  describe("GET /api/reservas/:reservaId", () => {
    test("debe retornar la reserva solicitada por ID", async () => {
      await Reserva.create({
        reservaId: reservaIdTest,
        aulaId: aulaIdTest,
        usuarioId: usuarioIdTest, // 👈 Solucionado notNull
        motivo: "Examen",
        fechaInicio: new Date("2026-07-15T10:00:00.000Z"),
        fechaFin: new Date("2026-07-15T12:00:00.000Z"),
        estado: "confirmada"
      });

      const response = await request(app)
        .get(`/api/reservas/${reservaIdTest}`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(response.body.reservaId).toBe(reservaIdTest);
      expect(response.body.motivo).toBe("Examen");
    });

    test("debe retornar status 404 o 500 si la reserva no existe", async () => {
      // 👈 Solucionado UUID syntax error: Usamos un formato UUID estructurado en ceros
      await request(app)
        .get("/api/reservas/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .expect((res) => {
          if (res.status !== 404 && res.status !== 500) {
            throw new Error("Debe retornar un error controlado de no existencia (404 o 500)");
          }
        });
    });
  });

  // ============================================================
  // 4) POST /api/reservas/verificar-conflictos
  // ============================================================
  describe("POST /api/reservas/verificar-conflictos", () => {
    test("debe procesar los cuerpos JSON y verificar los potenciales solapamientos", async () => {
      const response = await request(app)
        .post("/api/reservas/verificar-conflictos")
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .send({
          aulaId: aulaIdTest,
          fechaInicio: "2026-07-10T10:00:00.000Z",
          fechaFin: "2026-07-10T12:00:00.000Z",
          reservaIdExcluir: reservaIdTest
        })
        .expect(200);

      expect(response.body).toHaveProperty("hayConflictos");
      expect(response.body.hayConflictos).toBe(false);
    });
  });

 // ============================================================
  // 5) POST /api/reservas (Crear)
  // ============================================================
  describe("POST /api/reservas", () => {
    test("debe crear una reserva exitosamente si no existen conflictos previos", async () => {
  // Ahora el token tendrá el mismo UUID que el usuario creado en la base de datos
  const tokenAdminReal = generarTokenAdmin({ usuarioId: usuarioIdTest });

  const payload = {
    aulaId: aulaIdTest,
    usuarioId: usuarioIdTest,
    motivo: "Nueva Reserva Única",
    fechaInicio: "2026-08-01T10:00:00.000Z",
    fechaFin: "2026-08-01T12:00:00.000Z",
    estado: "confirmada",
    forzar: false
  };

  const response = await request(app)
    .post("/api/reservas")
    .set("Authorization", `Bearer ${tokenAdminReal}`)
    .send(payload);

  expect(response.status).toBe(201);
});

    test("debe retornar status 409 si hay solapamiento de horarios (error de negocio real)", async () => {
      const tokenAdminReal = generarTokenAdmin({ usuarioId: usuarioIdTest });
      const reservaPreviaId = "999e4567-e89b-12d3-a456-426614174999";
      
      // Creamos una reserva previa
      await Reserva.create({
        reservaId: reservaPreviaId,
        aulaId: aulaIdTest,
        usuarioId: usuarioIdTest, 
        motivo: "Clase Fija",
        fechaInicio: new Date("2026-07-12T18:00:00.000Z"),
        fechaFin: new Date("2026-07-12T20:00:00.000Z"),
        estado: "confirmada"
      });

      // Intentamos solapar
      const response = await request(app)
        .post("/api/reservas")
        .set("Authorization", `Bearer ${tokenAdminReal}`)
        .send({
          aulaId: aulaIdTest,
          usuarioId: usuarioIdTest,
          motivo: "Clase Intrusiva",
          fechaInicio: "2026-07-12T18:30:00.000Z",
          fechaFin: "2026-07-12T19:30:00.000Z",
          forzar: false
        });

      expect(response.status).toBe(409); 
    });
  });

  // ============================================================
  // 6) PUT /api/reservas/:reservaId (Actualizar)
  // ============================================================
  describe("PUT /api/reservas/:reservaId", () => {
    test("debe actualizar propiedades en la DB de forma real", async () => {
      await Reserva.create({
        reservaId: reservaIdTest,
        aulaId: aulaIdTest,
        usuarioId: usuarioIdTest, // 👈 Solucionado notNull
        motivo: "Reunión Inicial",
        fechaInicio: new Date("2026-07-20T09:00:00.000Z"),
        fechaFin: new Date("2026-07-20T11:00:00.000Z"),
        estado: "confirmada"
      });

      await request(app)
        .put(`/api/reservas/${reservaIdTest}`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .send({
          motivo: "Reunión de Cátedra Modificada"
        })
        .expect(200);

      const reservaModificada = await Reserva.findByPk(reservaIdTest);
      expect(reservaModificada.motivo).toBe("Reunión de Cátedra Modificada");
    });
  });

  // ============================================================
  // 7) DELETE /api/reservas/:reservaId (Cancelar / Soft Delete)
  // ============================================================
  describe("DELETE /api/reservas/:reservaId", () => {
    test("debe cancelar la reserva correctamente mutando su estado en la DB", async () => {
      jest.useRealTimers();

      await Reserva.create({
        reservaId: reservaIdTest,
        aulaId: aulaIdTest,
        usuarioId: usuarioIdTest, // 👈 Solucionado notNull
        motivo: "Conferencia a Cancelar",
        fechaInicio: new Date("2026-07-25T14:00:00.000Z"),
        fechaFin: new Date("2026-07-25T16:00:00.000Z"),
        estado: "confirmada"
      });

      await request(app)
        .delete(`/api/reservas/${reservaIdTest}`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .expect(200);

      const reservaDb = await Reserva.findByPk(reservaIdTest);
      expect(reservaDb.estado).toBe("cancelada");
    });
  });
  // ============================================================
  // 8) PRUEBAS DE CASOS BORDE Y SEGURIDAD
  // ============================================================
  describe("Casos de borde y validaciones de negocio", () => {
    
  test("debe impedir editar una reserva para que se solape con otra existente", async () => {
      // Reserva A
      await Reserva.create({
        reservaId: "222e4567-e89b-12d3-a456-426614174222",
        aulaId: aulaIdTest,
        usuarioId: usuarioIdTest,
        motivo: "Reserva A",
        fechaInicio: new Date("2026-07-21T09:00:00.000Z"),
        fechaFin: new Date("2026-07-21T10:00:00.000Z"),
        estado: "confirmada"
      });

      // Reserva B (la que editaremos)
      const resB = await Reserva.create({
        reservaId: "333e4567-e89b-12d3-a456-426614174333",
        aulaId: aulaIdTest,
        usuarioId: usuarioIdTest,
        motivo: "Reserva B",
        fechaInicio: new Date("2026-07-21T11:00:00.000Z"),
        fechaFin: new Date("2026-07-21T12:00:00.000Z"),
        estado: "confirmada"
      });

      // Intentamos mover B al horario de A
      const response = await request(app)
        .put(`/api/reservas/${resB.reservaId}`)
        .set("Authorization", `Bearer ${generarTokenAdmin({ usuarioId: usuarioIdTest })}`)
        .send({
          fechaInicio: "2026-07-21T09:30:00.000Z",
          fechaFin: "2026-07-21T10:30:00.000Z"
        });

      expect(response.status).toBe(409);
    });
  });
});