module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  verbose: true,

  clearMocks: true,//limpia mocks entre tests

  forceExit: true,//forzar salida después de las pruebas
};
