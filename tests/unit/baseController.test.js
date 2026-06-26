const BaseController = require("../../controllers/baseController"); // Ajustá la ruta según tu estructura

describe("Unit Tests - BaseController", () => {
  let mockService;
  let controller;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockService = {
      getAll: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const defaultOptions = { order: [["createdAt", "DESC"]] };
    controller = new BaseController(mockService, defaultOptions);

    // mockea los objetos de Express req, res y next
    req = {
      params: {},
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  // ============================================================================
  // Test: getAll
  // ============================================================================
  describe("getAll", () => {
    it("debería retornar todos los elementos usando las defaultOptions", async () => {
      const mockItems = [{ id: 1, name: "Item 1" }, { id: 2, name: "Item 2" }];
      mockService.getAll.mockResolvedValue(mockItems);

      await controller.getAll(req, res, next);

      // Verifica que llame al servicio con las opciones configuradas en el constructor
      expect(mockService.getAll).toHaveBeenCalledWith(controller.defaultOptions);
      expect(res.json).toHaveBeenCalledWith(mockItems);
    });
  });

  // ============================================================================
  // Test: getById
  // ============================================================================
  describe("getById", () => {
    it("debería retornar el elemento si existe", async () => {
      const mockItem = { id: "123", name: "Item Test" };
      req.params.id = "123";
      mockService.getById.mockResolvedValue(mockItem);

      await controller.getById(req, res, next);

      expect(mockService.getById).toHaveBeenCalledWith("123");
      expect(res.json).toHaveBeenCalledWith(mockItem);
    });

    it("debería responder con 404 si el elemento no existe", async () => {
      req.params.id = "999";
      mockService.getById.mockResolvedValue(null);

      await controller.getById(req, res, next);

      expect(mockService.getById).toHaveBeenCalledWith("999");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Registro no encontrado" });
    });
  });

  // ============================================================================
  // Test: create
  // ============================================================================
  describe("create", () => {
    it("debería crear un registro y retornar 201", async () => {
      const bodyData = { name: "Nuevo Registro" };
      const createdItem = { id: 1, ...bodyData };
      req.body = bodyData;
      mockService.create.mockResolvedValue(createdItem);

      await controller.create(req, res, next);

      expect(mockService.create).toHaveBeenCalledWith(bodyData);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(createdItem);
    });
  });

  // ============================================================================
  // Test: update
  // ============================================================================
  describe("update", () => {
    it("debería actualizar el registro con éxito si existe", async () => {
      req.params.id = "123";
      req.body = { name: "Nombre Actualizado" };
      mockService.update.mockResolvedValue(1); // Sequelize devuelve la cantidad de filas afectadas (1)

      await controller.update(req, res, next);

      expect(mockService.update).toHaveBeenCalledWith("123", req.body);
      expect(res.json).toHaveBeenCalledWith({ message: "Registro actualizado" });
    });

    it("debería responder con 404 si el registro a actualizar no existe", async () => {
      req.params.id = "999";
      req.body = { name: "Fallido" };
      mockService.update.mockResolvedValue(0); // 0 filas afectadas

      await controller.update(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Registro no encontrado" });
    });
  });

  // ============================================================================
  // Test: delete
  // ============================================================================
  describe("delete", () => {
    it("debería eliminar el registro con éxito si existe", async () => {
      req.params.id = "123";
      mockService.delete.mockResolvedValue(1); // 1 fila destruida

      await controller.delete(req, res, next);

      expect(mockService.delete).toHaveBeenCalledWith("123");
      expect(res.json).toHaveBeenCalledWith({ message: "Registro eliminado" });
    });

    it("debería responder con 404 si el registro a eliminar no existe", async () => {
      req.params.id = "999";
      mockService.delete.mockResolvedValue(0); // 0 filas destruidas

      await controller.delete(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Registro no encontrado" });
    });
  });
});