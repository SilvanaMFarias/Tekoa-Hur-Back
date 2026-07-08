const { Sequelize } = require("sequelize");

describe("Test de Integración - Conexión a la Base de Datos", () => {
  let sequelizeInstance;
  // Guardamos las variables originales para no romper otros tests del proyecto
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    // Restauramos el entorno limpio antes de cada test
    process.env = { ...originalEnv };
  });

  afterEach(async () => {
    if (sequelizeInstance && typeof sequelizeInstance.close === "function") {
      await sequelizeInstance.close();
    }
  });

  // --- CAMINO 1: Entramos por el IF (Configuración tipo Dokploy) ---
  it("Debería inicializar configurando los campos individuales si existe DB_HOST (Dokploy)", () => {
    // Simulamos que estamos en producción/Dokploy inyectando estas variables
    process.env.DB_HOST = "localhost";
    process.env.DB_USER = "postgres";
    process.env.DB_PASSWORD = "postgres123";
    process.env.DB_NAME = "tekoadb";
    delete process.env.DATABASE_URL; // Nos aseguramos de que no interfiera

    sequelizeInstance = require("../../config/database");

    expect(sequelizeInstance.options.host).toBe("localhost");
    expect(sequelizeInstance.options.dialect).toBe("postgres");
  });

  // --- CAMINO 2: Entramos por el ELSE (Configuración Local por URL) ---
  it("Debería inicializar parseando DATABASE_URL si no existe DB_HOST (Desarrollo local)", () => {
    // Nos aseguramos de que DB_HOST NO exista para forzar el ELSE
    delete process.env.DB_HOST;
    process.env.DATABASE_URL = "postgres://testuser:testpass@test-host:5432/testdb";

    sequelizeInstance = require("../../config/database");

    // Comprobamos que haya extraído bien los pedazos de la URL string
    expect(sequelizeInstance.options.host).toBe("test-host");
    expect(sequelizeInstance.config.username).toBe("testuser");
    expect(sequelizeInstance.config.password).toBe("testpass");
    expect(sequelizeInstance.config.database).toBe("testdb");
  });

  // --- CAMINO 3: El test de conexión real ---
  it("Debería conectarse con éxito a la base de datos física de pruebas", async () => {
    // Este test usará el entorno por defecto que ya tengas configurado en tu .env.test
    sequelizeInstance = require("../../config/database");
    
    await expect(sequelizeInstance.authenticate()).resolves.not.toThrow();
  });
});