module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  verbose: true,
  clearMocks: true, // limpia mocks entre tests
  forceExit: true, // forzar salida después de las pruebas
  collectCoverage: true, // Activa la cobertura automáticamente
watchPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/coverage/"],
  // Carpeta que Ssi debe medir el total de líneas
  collectCoverageFrom: [
    "**/*.{js,jsx,ts,tsx}",
  ],

  // Las carpetas o archivos que no queremos incluir
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/tests/",
    "/.github/",
    "/migrations/",
    "/.vscode/",
    "/seeders/",                 
    "/coverage/",                 
    "/public/swagger-autologin.js",
    "/public/",
    "/controllers/qrController.js", // Solo el controlador, no el servicio ni el modelo
    "/sync.js",
    "/jest.config.js",
    "/index.js",],
};