const { calcularDistanciaMetros, estaDentroDelRadio } = require("../../utils/geolocation"); // Ajusta la ruta si es necesario

describe("Tests Unitarios - Geolocalización", () => {
  
  // Coordenadas reales de prueba (Obelisco de Buenos Aires como centro)
  const LAT_OBELISCO = -34.6037389;
  const LNG_OBELISCO = -58.3815704;

  describe("calcularDistanciaMetros", () => {
    it("Debería devolver 0 metros si el origen y el destino son el mismo punto", () => {
      const distancia = calcularDistanciaMetros(LAT_OBELISCO, LNG_OBELISCO, LAT_OBELISCO, LNG_OBELISCO);
      expect(distancia).toBe(0);
    });

    it("Debería calcular correctamente la distancia entre dos puntos conocidos", () => {
      // Un punto a unos 300 metros del Obelisco (Teatro Colón: -34.6011, -58.3831)
      const latDestino = -34.6011;
      const lngDestino = -58.3831;

      const distancia = calcularDistanciaMetros(LAT_OBELISCO, LNG_OBELISCO, latDestino, lngDestino);

      // Como la Tierra no es una esfera perfecta en la vida real, usamos toBeCloseTo
      // para permitir un margen de precisión matemática aceptable en metros (ej: ~325 metros)
      expect(distancia).toBeGreaterThan(310);
      expect(distancia).toBeLessThan(340);
    });
  });

  describe("estaDentroDelRadio", () => {
    it("Debería devolver true si el usuario está exactamente en el centro", () => {
      const resultado = estaDentroDelRadio(LAT_OBELISCO, LNG_OBELISCO, LAT_OBELISCO, LNG_OBELISCO, 50);
      expect(resultado).toBe(true);
    });

    it("Debería devolver true si el usuario está dentro del rango permitido", () => {
      // Supongamos un usuario a 30 metros del centro
      // Forzamos un pequeño cambio en la longitud para simular cercanía
      const latUsuario = LAT_OBELISCO + 0.0001; 
      const lngUsuario = LNG_OBELISCO + 0.0001;
      const radioPermitido = 100; // 100 metros

      const resultado = estaDentroDelRadio(latUsuario, lngUsuario, LAT_OBELISCO, LNG_OBELISCO, radioPermitido);
      expect(resultado).toBe(true);
    });

    it("Debería devolver false si el usuario excede el radio permitido", () => {
      // Un punto bastante alejado (aprox a más de 300 metros como vimos con el Teatro Colón)
      const latUsuario = -34.6011;
      const lngUsuario = -58.3831;
      const radioPermitido = 50; // Solo permitimos 50 metros

      const resultado = estaDentroDelRadio(latUsuario, lngUsuario, LAT_OBELISCO, LNG_OBELISCO, radioPermitido);
      expect(resultado).toBe(false);
    });
  });
});