// ============================================================
// tests/unit/middlewares.test.js
// ============================================================

// 1. Mockear TODOS los modelos de Sequelize antes de requerir los componentes
jest.mock("../../models", () => ({
  Comision: { findByPk: jest.fn() },
  Matricula: { findOne: jest.fn() },
  Horario: { findOne: jest.fn() },
  Aula: { findOne: jest.fn() },
  Profesor: {},
}));

const basicAuth = require("../../middleware/basicAuth");
const validateForeignKey = require("../../middleware/foreignKeyValidation");
const validateRequiredFields = require("../../middleware/requiredFields");
const errorHandler = require("../../middleware/errorHandlers");
const validateAsistencia = require("../../middleware/validateAsistencia");
const { validateData } = require("../../middleware/dataValidation"); 
const { Comision, Matricula, Horario, Aula } = require("../../models");

// Mock simple de un modelo de Sequelize para probar Foreign Keys genéricas
const MockModel = {
  name: "MockModel",
  findOne: jest.fn(),
};

describe("Pruebas Unitarias de Middlewares de Soporte", () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {}, body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  // ==========================================
  // TESTS PARA BASIC AUTH
  // ==========================================
  describe("basicAuth Middleware", () => {
    it("debe retornar 400 si req no tiene headers", () => {
      basicAuth(null, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("debe retornar 401 si falta el encabezado Authorization", () => {
      basicAuth(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("debe retornar 401 si el scheme no es Basic", () => {
      req.headers["authorization"] = "Bearer token123";
      basicAuth(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("debe retornar 403 si las credenciales son inválidas", () => {
      process.env.BASIC_USER = "admin";
      process.env.BASIC_PASS = "1234";
      req.headers["authorization"] = "Basic dXN1YXJpbzpjb250cmFzZW5h"; // usuario:contrasena
      basicAuth(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("debe llamar a next() si las credenciales son válidas", () => {
      process.env.BASIC_USER = "admin";
      process.env.BASIC_PASS = "1234";
      req.headers["authorization"] = "Basic YWRtaW46MTIzNA=="; // admin:1234
      basicAuth(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  // ==========================================
  // TESTS PARA FOREIGN KEY VALIDATION
  // ==========================================
  describe("validateForeignKey Middleware", () => {
    it("debe pasar al siguiente middleware si el campo no viene en el body", async () => {
      const middleware = validateForeignKey(MockModel, "comisionId");
      await middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it("debe retornar error 400 si la clave foránea no existe en la BD", async () => {
      req.body.comisionId = 999;
      MockModel.findOne.mockResolvedValue(null);

      const middleware = validateForeignKey(MockModel, "comisionId");
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      const errorPasado = next.mock.calls[0][0];
      expect(errorPasado.status).toBe(400);
      expect(errorPasado.message).toContain("no existe en MockModel");
    });

    it("debe pasar con éxito si la clave foránea existe en la BD", async () => {
      req.body.comisionId = 1;
      MockModel.findOne.mockResolvedValue({ id: 1 });

      const middleware = validateForeignKey(MockModel, "comisionId");
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("debe capturar errores del catch y pasarlos a next", async () => {
      req.body.comisionId = 1;
      MockModel.findOne.mockRejectedValue(new Error("Error de Base de Datos"));

      const middleware = validateForeignKey(MockModel, "comisionId");
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "Error de Base de Datos" }));
    });
  });

  // ==========================================
  // TESTS PARA REQUIRED FIELDS
  // ==========================================
  describe("validateRequiredFields Middleware", () => {
    it("debe lanzar un error 400 si faltan campos requeridos", () => {
      req.body = { tipoUsuario: "ESTUDIANTE" };
      const middleware = validateRequiredFields(["tipoUsuario", "fecha"]);
      
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      const errorPasado = next.mock.calls[0][0];
      expect(errorPasado.status).toBe(400);
      expect(errorPasado.message).toContain("Campos requeridos faltantes");
    });
  });

  // ==========================================
  // TESTS PARA ERROR HANDLER
  // ==========================================
  describe("errorHandler Middleware", () => {
    beforeEach(() => {
      jest.spyOn(console, "error").mockImplementation(() => {});
    });

    it("debe manejar un SequelizeUniqueConstraintError devolviendo 409", () => {
      const error = { name: "SequelizeUniqueConstraintError" };
      errorHandler(error, req, res, next);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("debe manejar un SequelizeValidationError devolviendo 400", () => {
      const error = {
        name: "SequelizeValidationError",
        errors: [{ message: "Formato inválido" }],
      };
      errorHandler(error, req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ==========================================
  // TESTS PARA VALIDATE ASISTENCIA
  // ==========================================
  describe("validateAsistencia Middleware", () => {
    beforeEach(() => {
      req.body = {
        tipoUsuario: "ESTUDIANTE",
        usuarioId: "12345678",
        comisionId: 1,
        fecha: "2026-07-05", // Domingo (getDay = 0)
        horaRegistro: "19:00",
        aulaId: 10,
        rtoken: "token-valido"
      };
      jest.spyOn(console, "error").mockImplementation(() => {});
    });

    it("debe retornar 404 si la comisión no existe", async () => {
      Comision.findByPk.mockResolvedValue(null);

      await validateAsistencia(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Comisión 1 no existe." }));
    });

    it("debe retornar 403 si el tipoUsuario es ESTUDIANTE y no está matriculado", async () => {
      Comision.findByPk.mockResolvedValue({ id: 1, profesor: null });
      Matricula.findOne.mockResolvedValue(null);

      await validateAsistencia(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "El estudiante no está matriculado en esta comisión." }));
    });

    it("debe retornar 403 si el tipoUsuario es PROFESOR y no es el titular", async () => {
      req.body.tipoUsuario = "PROFESOR";
      req.body.usuarioId = "99999999";
      Comision.findByPk.mockResolvedValue({
        id: 1,
        profesor: { dni: "44444444" }
      });

      await validateAsistencia(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Este docente no es el titular de la comisión." }));
    });

    it("debe retornar 400 si el tipo de usuario no es válido", async () => {
      req.body.tipoUsuario = "ADMIN";
      Comision.findByPk.mockResolvedValue({ id: 1, profesor: null });

      await validateAsistencia(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Tipo de usuario no válido." }));
    });

    it("debe retornar 400 si está fuera de horario", async () => {
      Comision.findByPk.mockResolvedValue({ id: 1, profesor: null });
      Matricula.findOne.mockResolvedValue({ estudianteDni: "12345678", comisionId: 1 });
      Horario.findOne.mockResolvedValue(null);

      await validateAsistencia(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Fuera de horario")
        })
      );
    });

    it("debe retornar 403 si el QR/rtoken es inválido", async () => {
      Comision.findByPk.mockResolvedValue({ id: 1, profesor: null });
      Matricula.findOne.mockResolvedValue({ id: 1 });
      Horario.findOne.mockResolvedValue({ aulaId: 10 });
      Aula.findOne.mockResolvedValue(null);

      await validateAsistencia(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "QR inválido o expirado." }));
    });

    it("debe retornar 403 si el QR (rtokenExpira) ya expiró", async () => {
      Comision.findByPk.mockResolvedValue({ id: 1, profesor: null });
      Matricula.findOne.mockResolvedValue({ id: 1 });
      Horario.findOne.mockResolvedValue({ aulaId: 10 });
      Aula.findOne.mockResolvedValue({
        aulaId: 10,
        rtoken: "token-valido",
        rtokenExpira: "2000-01-01T00:00:00.000Z" 
      });

      await validateAsistencia(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "El QR expiró." }));
    });

    it("debe retornar 400 si el aulaId ingresado no coincide con el horario planificado", async () => {
      Comision.findByPk.mockResolvedValue({ id: 1, profesor: null });
      Matricula.findOne.mockResolvedValue({ id: 1 });
      Horario.findOne.mockResolvedValue({
        aulaId: 99, 
        aula: { sector: "A", numero: "101" }
      });
      Aula.findOne.mockResolvedValue({
        aulaId: 10,
        rtoken: "token-valido",
        rtokenExpira: "2030-01-01T00:00:00.000Z"
      });

      await validateAsistencia(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Aula incorrecta: corresponde")
        })
      );
    });

    it("debe llamar a next() e inyectar el horario si todo es correcto", async () => {
      Comision.findByPk.mockResolvedValue({ id: 1, profesor: null });
      Matricula.findOne.mockResolvedValue({ id: 1 });
      
      const mockHorario = { aulaId: 10, id: 5 };
      Horario.findOne.mockResolvedValue(mockHorario);
      Aula.findOne.mockResolvedValue({
        aulaId: 10,
        rtoken: "token-valido",
        rtokenExpira: "2030-01-01T00:00:00.000Z"
      });

      await validateAsistencia(req, res, next);

      expect(req.horarioValidado).toBe(mockHorario);
      expect(next).toHaveBeenCalled();
    });

    it("debe retornar 500 si ocurre una excepción inesperada (catch block)", async () => {
      Comision.findByPk.mockRejectedValue(new Error("Fallo masivo de base de datos"));

      await validateAsistencia(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Error interno al validar asistencia." }));
    });
  });

  // ==========================================
  // 📌 CORRECCIÓN 2: MOVIDO A SU PROPIO BLOQUE INDEPENDIENTE
  // TESTS PARA VALIDATE DATA
  // ==========================================
  describe("validateData Middleware", () => {
    it("debe acumular errores y retornar 400 si un campo tiene formato inválido", () => {
      req.body = { email: "correo-incorrecto-sin-arroba" };

      const esquemaValidacion = {
        email: (val) => val.includes("@")
      };

      const middleware = validateData(esquemaValidacion);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      
      const errorPasado = next.mock.calls[0][0];
      expect(errorPasado.status).toBe(400);
      expect(errorPasado.message).toContain("Errores de validación: Formato inválido para el campo email");
    });
  });
});