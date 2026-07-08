require("../setup/test-db");
const request = require("supertest");
const app = require("../../app");
const { generarTokenAdmin } = require("../setup/auth");
const { crearAula, crearUsuario, crearHorario } = require("../setup/factories");

// Importamos sequelize para cerrar las conexiones al final
const { 
  Reserva, 
  Horario, 
  Feriado, 
  EspacioQR, 
  AulaAtributos,
  TipoEvento,
  sequelize 
} = require("../../models"); 

describe("Pruebas del Módulo de Calendario de Ocupación (E2E)", () => {
  let tokenAdmin;
  let aulaTest;
  let usuarioTest;

  beforeAll(() => {
    tokenAdmin = generarTokenAdmin();
  });

  // Limpieza del pool de conexiones al terminar la suite
  afterAll(async () => {
    if (sequelize) {
      await sequelize.close();
    }
  });

  beforeEach(async () => {
    // Limpieza profunda de tablas
    await Reserva.destroy({ where: {}, truncate: true, cascade: true }); 
    await Horario.destroy({ where: {}, truncate: true, cascade: true });
    await Feriado.destroy({ where: {}, truncate: true, cascade: true });
    await EspacioQR.destroy({ where: {}, truncate: true, cascade: true });
    await AulaAtributos.destroy({ where: {}, truncate: true, cascade: true });
    
    usuarioTest = await crearUsuario({ rol: "docente" });
    aulaTest = await crearAula({ sector: "TEST", numero: "101" });

    jest.useFakeTimers({
      doNotFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'setImmediate',
        'clearImmediate',
        'process',
        'nextTick'
      ]
    });
  
    jest.setSystemTime(new Date("2026-07-06T14:30:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("GET /api/aulas/:aulaId/ocupacion (Privado Admin)", () => {
    
    test("debe retornar 404 si el aula no existe", async () => {
      const uuidInexistente = "11111111-1111-1111-1111-111111111111";
      const response = await request(app)
        .get(`/api/aulas/${uuidInexistente}/ocupacion`) 
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .expect(404);

      expect(response.body.error).toBe("Aula no encontrada");
    });

    test("debe retornar reservas activas mapeadas correctamente", async () => {
      await Reserva.create({
        aulaId: aulaTest.aulaId,
        usuarioId: usuarioTest.usuarioId,
        estado: "confirmada",
        motivo: "Reserva de prueba E2E",
        fechaInicio: new Date("2026-07-10T10:00:00Z"), 
        fechaFin: new Date("2026-07-10T12:00:00Z"),
      });

      const response = await request(app)
        .get(`/api/aulas/${aulaTest.aulaId}/ocupacion`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .query({ desde: "2026-07-01", hasta: "2026-07-31", soloVigentes: "true" })
        .expect(200);

      expect(response.body.eventos.length).toBe(1);
      expect(response.body.eventos[0].tipo).toBe("reserva");
      expect(response.body.eventos[0].title).toBe("Reserva de prueba E2E");
    });
    
    test("debe filtrar eventos pasados de hoy si soloVigentes es true", async () => {
      await crearHorario({
        aulaId: aulaTest.aulaId,
        diaSemana: "Lunes",
        horaDesde: "08:00",
        horaHasta: "09:00"
      });

      const response = await request(app)
        .get(`/api/aulas/${aulaTest.aulaId}/ocupacion`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .query({ desde: "2026-07-06", hasta: "2026-07-06", soloVigentes: "true" })
        .expect(200);

      expect(response.body.eventos.length).toBe(0);
    });
  });

  describe("GET /api/qr/espacio/calendario/:token (Vista Pública por QR)", () => {
    let qrTest;

    beforeEach(async () => {
      qrTest = await EspacioQR.create({
        aulaId: aulaTest.aulaId,
        edificioId: aulaTest.edificioId, 
        token: "TOKEN_SECRETO_123",
        activo: true
      });

      await AulaAtributos.create({
        aulaId: aulaTest.aulaId,
        tieneProyector: true, 
        capacidad: 50
      });
    });

    test("debe devolver 403 si el QR es inválido o inactivo", async () => {
      const responseFake = await request(app)
        .get("/api/qr/espacio/calendario/TOKEN_INVENTADO")
        .expect(403);
      expect(responseFake.body.error).toBe("QR inválido o desactivado");

      await qrTest.update({ activo: false });
      const responseInactivo = await request(app)
        .get(`/api/qr/espacio/calendario/${qrTest.token}`)
        .expect(403);
      expect(responseInactivo.body.error).toBe("QR inválido o desactivado");
    });

    test("debe devolver la ocupación de HOY y los atributos del aula", async () => {
      await Reserva.create({
        aulaId: aulaTest.aulaId,
        usuarioId: usuarioTest.usuarioId,
        estado: "confirmada",
        motivo: "Examen Final",
        fechaInicio: new Date("2026-07-06T16:00:00Z"),
        fechaFin: new Date("2026-07-06T18:00:00Z"),
      });

      const response = await request(app)
        .get(`/api/qr/espacio/calendario/${qrTest.token}`)
        .expect(200); 

      expect(response.body.atributos).toBeDefined();
      expect(response.body.atributos.capacidad).toBe(50);
      expect(response.body.eventos.length).toBe(1);
    });
  });
});