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

    // Mockeamos las funciones globales del sistema para que no rompan Jest
    mockExit = jest.spyOn(process, "exit").mockImplementation(() => {});
    mockLog = jest.spyOn(console, "log").mockImplementation(() => {});
    mockError = jest.spyOn(console, "error").mockImplementation(() => {});
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restauramos el estado original de process.argv
    process.argv = originalArgv;
    // Restauramos los mocks globales
    mockExit.mockRestore();
    mockLog.mockRestore();
    mockError.mockRestore();
    jest.resetModules(); // Clave para volver a requerir el script en cada test
  });

  it("debe salir con error si no se pasa un usuario por argumento", () => {
    // Simulamos que corremos: node encodeBasicAuth.js (sin argumentos)
    process.argv = ["node", "encodeBasicAuth.js"];

    // Ejecutamos el archivo
    require("../../encodeBasicAuth");

    expect(mockError).toHaveBeenCalledWith("Uso: node encodeBasicAuth.js <usuario>");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("debe mostrar error si el usuario no existe en users.json", () => {
    // Simulamos que pasamos un usuario inexistente
    process.argv = ["node", "encodeBasicAuth.js", "usuarioInexistente"];
    
    // Mockeamos la lectura del json para que devuelva un usuario válido pero distinto
    jest.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify({ admin: "1234" }));

    require("../../encodeBasicAuth");

    expect(mockError).toHaveBeenCalledWith("Usuario no encontrado en users.json");
    expect(mockExit).not.toHaveBeenCalled();
  });

  it("debe generar correctamente el header si el usuario existe", () => {
    // Simulamos que pasamos el usuario 'admin'
    process.argv = ["node", "encodeBasicAuth.js", "admin"];
    
    // Forzamos el contenido controlado de users.json
    jest.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify({ admin: "1234" }));

    require("../../encodeBasicAuth");

    // Base64 de admin:1234 -> YWRtaW46MTIzNA==
    expect(mockLog).toHaveBeenCalledWith("Authorization: Basic YWRtaW46MTIzNA==");
    expect(mockError).not.toHaveBeenCalled();
    expect(mockExit).not.toHaveBeenCalled();
  });
});