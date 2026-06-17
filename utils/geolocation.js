// ============================================================
// utils/geolocation.js
// ============================================================
// Utilidades para cálculos geográficos.
//
// Actualmente se utiliza para validar que un usuario se
// encuentre dentro de una geocerca (geofence) antes de
// registrar una asistencia mediante QR.
//
// Todas las distancias se devuelven en metros.
// ============================================================

/**
 * Convierte un ángulo expresado en grados a radianes.
 *
 * Las funciones trigonométricas de JavaScript trabajan
 * en radianes, por lo que las coordenadas geográficas
 * deben convertirse antes de aplicar la fórmula de Haversine.
 *
 * @param {number} grados
 * @returns {number}
 */
function convertirGradosARadianes(grados) {
  return (grados * Math.PI) / 180;
}

/**
 * Calcula la distancia entre dos puntos geográficos
 * utilizando la fórmula de Haversine.
 *
 * Parámetros:
 *  - latitudOrigen
 *  - longitudOrigen
 *  - latitudDestino
 *  - longitudDestino
 *
 * Retorna la distancia en metros.
 *
 * @param {number} latitudOrigen
 * @param {number} longitudOrigen
 * @param {number} latitudDestino
 * @param {number} longitudDestino
 * @returns {number}
 */
function calcularDistanciaMetros(
  latitudOrigen,
  longitudOrigen,
  latitudDestino,
  longitudDestino
) {
  // Radio medio de la Tierra en metros.
  const radioTierraMetros = 6371000;

  // Diferencia de coordenadas convertidas a radianes.
  const diferenciaLatitud = convertirGradosARadianes(
    latitudDestino - latitudOrigen
  );

  const diferenciaLongitud = convertirGradosARadianes(
    longitudDestino - longitudOrigen
  );

  // Fórmula de Haversine.
  const componenteHaversine =
    Math.sin(diferenciaLatitud / 2) ** 2 +
    Math.cos(convertirGradosARadianes(latitudOrigen)) *
      Math.cos(convertirGradosARadianes(latitudDestino)) *
      Math.sin(diferenciaLongitud / 2) ** 2;

  const anguloCentral =
    2 *
    Math.atan2(
      Math.sqrt(componenteHaversine),
      Math.sqrt(1 - componenteHaversine)
    );

  return radioTierraMetros * anguloCentral;
}

/**
 * Determina si una coordenada se encuentra dentro
 * de un radio determinado.
 *
 * @param {number} latitudUsuario
 * @param {number} longitudUsuario
 * @param {number} latitudCentro
 * @param {number} longitudCentro
 * @param {number} radioPermitidoMetros
 * @returns {boolean}
 */
function estaDentroDelRadio(
  latitudUsuario,
  longitudUsuario,
  latitudCentro,
  longitudCentro,
  radioPermitidoMetros
) {
  const distanciaMetros = calcularDistanciaMetros(
    latitudUsuario,
    longitudUsuario,
    latitudCentro,
    longitudCentro
  );

  return distanciaMetros <= radioPermitidoMetros;
}

module.exports = {
  calcularDistanciaMetros,
  estaDentroDelRadio,
};