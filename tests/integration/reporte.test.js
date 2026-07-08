require("../setup/test-db");
const request = require("supertest");
const app = require("../../app");
const { generarTokenAdmin } = require("../setup/auth");
const { 
  crearComision, 
  crearEstudiante, 
  crearAsistencia, 
  crearHorario, 
  crearMatricula 
} = require("../setup/factories");

const guaraniService = require("../../services/guaraniService");
jest.mock("../../services/guaraniService");

// MOCK DE PUPPETEER: Evita que levante un navegador real y cuelgue los hilos de Jest
const mockPage = {
  setContent: jest.fn().mockResolvedValue(undefined),
  pdf: jest.fn().mockResolvedValue(Buffer.from("%PDF-1.4 mock pdf content"))
};
const mockBrowser = {
  newPage: jest.fn().mockResolvedValue(mockPage),
  close: jest.fn().mockResolvedValue(undefined)
};
jest.mock("puppeteer", () => ({
  launch: jest.fn().mockResolvedValue(mockBrowser)
}));

describe("Pruebas del Módulo de Reportes de Asistencia", () => {
  let token;
  let dniTestUser;

  beforeAll(() => {
    token = generarTokenAdmin();
    dniTestUser = "12345678"; 
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-01T19:30:00")); 
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================================
  // OBTENER REPORTE DE ASISTENCIAS (GET /api/reportes/mis-asistencias)
  // ============================================================
  describe("GET /api/reportes/mis-asistencias", () => {

    test("debe devolver un archivo CSV exitosamente si hay asistencias", async () => {
      guaraniService.getPeriodosTekoa.mockResolvedValue([
        {
          periodo: "256",
          fecha_inicio_dictado: "2026-03-01",
          fecha_fin_dictado: "2026-07-15"
        }
      ]);

      const comision = await crearComision();
      const comisionIdFinal = comision.comisionId || comision.id;

      const estudiante = await crearEstudiante({ dni: dniTestUser });

      await crearMatricula({
        estudianteDni: estudiante.dni,
        comisionId: comisionIdFinal
      });

      await crearHorario({
        comisionId: comisionIdFinal,
        diaSemana: "lunes",
        horaDesde: "18:00",
        horaHasta: "22:00"
      });

      await crearAsistencia({
        usuarioId: estudiante.dni,
        comisionId: comisionIdFinal,
        fecha: "2026-06-01",
        estado: "PRESENTE",
        tipoUsuario: "ESTUDIANTE",
        horaRegistro: "19:30:00"
      });

      const response = await request(app)
        .get("/api/reportes/mis-asistencias")
        .set("Authorization", `Bearer ${token}`)
        .query({
          comisionId: comisionIdFinal,
          format: "csv"
        });

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/csv");
    });

    test("debe devolver 400 si el formato de reporte solicitado no es válido", async () => {
      jest.useRealTimers();

      const response = await request(app)
        .get("/api/reportes/mis-asistencias")
        .set("Authorization", `Bearer ${token}`)
        .query({
          format: "excel_invalido"
        });

      expect(response.status).toBe(400);
    });

    test("debe devolver 404 si la comisión especificada no existe en el sistema", async () => {
      jest.useRealTimers();
      
      // CRUCIAL: Creamos el estudiante para que pase la primera barrera del servicio
      await crearEstudiante({ dni: dniTestUser });
      
      const comisionIdInvalido = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

      const response = await request(app)
        .get("/api/reportes/mis-asistencias")
        .set("Authorization", `Bearer ${token}`)
        .query({
          comisionId: comisionIdInvalido,
          format: "csv"
        });

      expect(response.status).toBe(404);
      const codigoError = response.body.codigo || response.body.code;
      expect(codigoError).toBe("COMMISSION_NOT_FOUND");
    });

    test("debe devolver un CSV con aviso de 'sin registros' si la lista de clases calculada queda vacía", async () => {
      const comision = await crearComision();
      const comisionIdFinal = comision.comisionId || comision.id;
      const estudiante = await crearEstudiante({ dni: dniTestUser });

      await crearMatricula({
        estudianteDni: estudiante.dni,
        comisionId: comisionIdFinal
      });

      const response = await request(app)
        .get("/api/reportes/mis-asistencias")
        .set("Authorization", `Bearer ${token}`)
        .query({
          comisionId: comisionIdFinal,
          format: "csv"
        });

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/csv");
      expect(response.text).toContain("No hay registros en el rango");
    });

  });
});