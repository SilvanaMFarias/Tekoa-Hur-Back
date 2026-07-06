// ============================================================
// tests/unit/encodeBasicAuth.test.js
// ============================================================
const fs = require("fs");

describe("Script encodeBasicAuth.js", () => {
  let mockExit, mockLog, mockError;
  let originalArgv;

  beforeEach(() => {
    // Salvamos los argumentos originales de la consola
    originalArgv = [...process.argv];

    // Mockeamos las funciones globales del sistema
    mockExit = jest.spyOn(process, "exit").mockImplementation(() => {});
    mockLog = jest.spyOn(console, "log").mockImplementation(() => {});
    mockError = jest.spyOn(console, "error").mockImplementation(() => {});

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restauramos el estado original de process.argv y los mocks de consola
    process.argv = originalArgv;
    mockExit.mockRestore();
    mockLog.mockRestore();
    mockError.mockRestore();
    
    // IMPORTANTE: Restauramos CUALQUIER mock que se haya hecho sobre fs en el test individual
    jest.restoreAllMocks();
    jest.resetModules(); 
  });

  it("debe salir con error si no se pasa un usuario por argumento", () => {
    process.argv = ["node", "encodeBasicAuth.js"];

    // MOCK SEGURO E INDIVIDUAL: Solo vive durante la ejecución de este IT
    const spyFs = jest.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify({ admin: "1234" }));

    require("../../encodeBasicAuth");

    expect(mockError).toHaveBeenCalledWith("Uso: node encodeBasicAuth.js <usuario>");
    expect(mockExit).toHaveBeenCalledWith(1);
    
    spyFs.mockRestore(); // Nos aseguramos de apagarlo inmediatamente
  });

  it("debe mostrar error si el usuario no existe en users.json", () => {
    process.argv = ["node", "encodeBasicAuth.js", "usuarioInexistente"];
    
    const spyFs = jest.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify({ admin: "1234" }));

    require("../../encodeBasicAuth");

    expect(mockError).toHaveBeenCalledWith("Usuario no encontrado en users.json");
    expect(mockExit).not.toHaveBeenCalled();

    spyFs.mockRestore();
  });

  it("debe generar correctamente el header si el usuario existe", () => {
    process.argv = ["node", "encodeBasicAuth.js", "admin"];
    
    const spyFs = jest.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify({ admin: "1234" }));

    require("../../encodeBasicAuth");

    expect(mockLog).toHaveBeenCalledWith("Authorization: Basic YWRtaW46MTIzNA==");
    expect(mockError).not.toHaveBeenCalled();
    expect(mockExit).not.toHaveBeenCalled();

    spyFs.mockRestore();
  });
});