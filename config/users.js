const fs = require("fs");

function getUsers() {
  // Para usar variables de entorno en dokploy
  if (process.env.SWAGGER_USERS_JSON) {
    return JSON.parse(process.env.SWAGGER_USERS_JSON);
  }

  if (process.env.SWAGGER_USERS) {
    const users = {};
    process.env.SWAGGER_USERS.split(",").forEach(pair => {
      const [user, pass] = pair.split(":");
      if (user && pass) users[user] = pass;
    });
    return users;
  }

  // para usar el archivo local (solo dev)
  try {
    return JSON.parse(fs.readFileSync("users.json", "utf8"));
  } catch (err) {
    console.warn("⚠️ No hay usuarios configurados");
    return {};
  }
}

module.exports = getUsers;