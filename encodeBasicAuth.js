// encodeBasicAuth.js
// Script para generar el header Authorization con Basic Auth

//const fs = require("fs");

// Leer usuarios desde users.json
//const users = JSON.parse(fs.readFileSync("users.json", "utf8"));

//Para usar variables de entorno en dokploy o users.json local
require("dotenv").config();
const getUsers = require("./config/users");

const users = getUsers();


// Función para generar header
function generateAuthHeader(username) {
  const password = users[username];
  if (!password) {
    console.error("Usuario no encontrado en users.json");
    return;
  }
  const token = Buffer.from(`${username}:${password}`).toString("base64");
  console.log(`Authorization: Basic ${token}`);
}

// Ejemplo: pasar el usuario por argumento
const username = process.argv[2];
if (!username) {
  console.error("Uso: node encodeBasicAuth.js <usuario>");
  process.exit(1);
}

generateAuthHeader(username);