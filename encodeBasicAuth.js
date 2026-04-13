// encodeBasicAuth.js
// Script para generar el header Authorization con Basic Auth

function generarHeaderBasicAuth(usuario, clave) {
  const cadena = `${usuario}:${clave}`;
  const base64 = Buffer.from(cadena).toString("base64");
  return `Authorization: Basic ${base64}`;
}

// Ejemplo de uso
const usuario = "yamil";        // Cambiá por el usuario que quieras
const clave = "3026"; // Cambiá por la clave que quieras

const header = generarHeaderBasicAuth(usuario, clave);
console.log("Header generado:");
console.log(header);

