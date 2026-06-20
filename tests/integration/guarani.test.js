require("../setup/test-db"); // Si comparte la configuración general
const request = require("supertest");
const app = require("../../app");
const guaraniService = require("../../services/guaraniService");
const AppError = require("../../errors/AppError");
const { generarTokenAdmin } = require("../setup/auth");
// Mockeamos el fetch global de Node.js de manera limpia usando espías
describe("Pruebas de Integración - Módulo Guaraní", () => {
  let originalEnv;
  let fetchSpy;
  let token;

  beforeAll(() => {
    // Guardamos el entorno original para no pisar credenciales reales de desarrollo
    originalEnv = { ...process.env };
    // Generamos el token JWT necesario para superar el middleware jwtAuth
    token = generarTokenAdmin();
  });

  beforeEach(() => {
    // Seteamos credenciales ficticias para asegurar que corra el flujo normal
    process.env.GUARANI_API_USER = "user_test_unahur";
    process.env.GUARANI_API_PASS = "pass_test_unahur";
    process.env.GUARANI_PERIODOS_TEKOA_URL = "https://guarani-testing.unahur.edu.ar/guarani/3.22/rest/v1/periodos-tekoa";

    // Espiamos el fetch global de Node
    fetchSpy = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    // Restauramos el entorno a su estado original
    process.env = originalEnv;
  });

  // ============================================================
  // TEST DE INTEGRACIÓN ENDPOINT HTTP
  // ============================================================
  describe("GET /api/guarani/periodos-tekoa", () => {
    
    test("debe retornar la lista de periodos académicos de forma exitosa", async () => {
      const mockPeriodosData = [
        {
          periodo: "256",
          fecha_inicio_dictado: "2026-03-01",
          fecha_fin_dictado: "2026-07-15"
        }
      ];

      // Simulamos que la llamada fetch al SIU Guaraní responde un 200 OK con los datos
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPeriodosData
      });

      // Hacemos la petición a la ruta exacta pasando el Bearer Token
      const response = await request(app)
        .get("/api/guarani/periodos-tekoa")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].periodo).toBe("256");

      // Validamos que el servicio armó la petición hacia Guaraní con la estructura correcta
      expect(fetchSpy).toHaveBeenCalledWith(
        process.env.GUARANI_PERIODOS_TEKOA_URL,
        expect.objectContaining({
          headers: {
            Authorization: expect.stringContaining("Basic "),
            Accept: "application/json"
          }
        })
      );
    });

    test("debe propagar el código de error si Guaraní responde con un fallo de servidor (ej: 500)", async () => {
      // Simulamos un error del lado del servidor de Guaraní
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500
      });

      const response = await request(app)
        .get("/api/guarani/periodos-tekoa")
        .set("Authorization", `Bearer ${token}`);

      // El asyncHandler captura el AppError lanzado por tu Service y tu middleware responde 500
      expect(response.status).toBe(500);
    });

    test("debe rechazar con 401 si se intenta acceder sin proveer un token JWT", async () => {
      // Intentamos pegarle sin usar .set("Authorization", ...)
      const response = await request(app).get("/api/guarani/periodos-tekoa");
      
      // jwtAuth interceptará la petición antes de que llegue al controlador
      expect(response.status).toBe(401);
    });
  });

  // ============================================================
  // TEST DE INTEGRACIÓN CAPA SERVICIO
  // ============================================================
  describe("GuaraniService - Lógica de Negocio", () => {

    test("getAuthHeader() debe arrojar un AppError si faltan configurar las credenciales en el .env", () => {
      delete process.env.GUARANI_API_USER;
      delete process.env.GUARANI_API_PASS;

      expect(() => {
        guaraniService.getAuthHeader();
      }).toThrow(AppError);

      try {
        guaraniService.getAuthHeader();
      } catch (error) {
        expect(error.status).toBe(400);
        expect(error.message).toContain("Faltan configurar las credenciales de Guarani.");
      }
    });

    test("getAuthHeader() debe codificar adecuadamente las credenciales en formato Base64", () => {
      process.env.GUARANI_API_USER = "usuarioEjemplo";
      process.env.GUARANI_API_PASS = "claveEjemplo";

      // 'usuarioEjemplo:claveEjemplo' en Base64 es: dXN1YXJpb0VqZW1wbG86Y2xhdmVFamVtcGxv
      const headerEsperado = "Basic dXN1YXJpb0VqZW1wbG86Y2xhdmVFamVtcGxv";
      expect(guaraniService.getAuthHeader()).toBe(headerEsperado);
    });
  });
});