# 🌱 Tekoa-Hur-Back

Sistema académico desarrollado como parte de la tesina en la **Universidad Nacional de Hurlingham (UNAHUR)**.  
Incluye gestión de estudiantes, materias, profesores y asistencia, con documentación interactiva vía **Swagger**.

---

## 🚀 Características principales
- API REST con **Node.js + Express**
- Base de datos **PostgreSQL** gestionada con **Sequelize**
- Documentación interactiva con **Swagger UI**
- Autenticación con **Basic Auth** y login personalizado
- Configuración de usuarios mediante archivo `users.json`

---

### Creación e intalacion de la base de datos:
Recordar tener `Postgres` instalado antes.
### - Instalar dependencias para sequelize
```bash
npm install sequelize pg pg-hstore
```
```bash
npm install --save-dev sequelize-cli
```

### - Crear la DB
```bash
npx sequelize-cli db:create
```

### - Crear las tablas de acuerdo a los models
```bash
node sync.js
```

## -Para correr los seeders instalar UUID
```bash
npm install uuid
```

### Ejecutar los seeders
```bash
npx sequelize-cli db:seed:all
```

---

### Instalar swagger
```bash
npm install swagger-jsdoc swagger-ui-express
```
---
### Autentificación básica
### Instalar libreris para que funcione autentificación básica
```bash
npm install express-basic-auth
```

### Instalacion dependencias. Pantalla logueo swagger.
Por necesidad de manejar sesiones y formularios.
```bash
npm install express-session body-parser
```

---
---

### Opcional
En caso de habilitar seguridad en los endpoint hay que pasar como encabezado la clave en base64, para esto correr el siguiente script para generar por consola en la raíz del proyecto. (controlar que el archivo se encuentre en la raíz. `encodeBasicAuth.js`).
- El usuario debe estar cargado con su clave en el archvio: `users.json` (raíz del proyecto).
```bash
node encodeBasicAuth.js nombre_usuarios
```
Generará algo similar a:
```bash
Authorization: Basic eWFtaWw6bWlDbGF2ZVNlZ3VyYQ==
```
---
### Luego se copia el header y se puede pegar en el postman o usar en curl
```bash
curl -H "Authorization: Basic eWFtaWw6bWlDbGF2ZVNlZ3VyYQ==" http://localhost:3001/api/edificios
```

---
---

### Probar swagger
```bash
node index.js
```
Abre tu navegador en: http://localhost:3001/api-docs
Se vera una interfaz interactiva con:
- Los endpoints como GET y POST
- La posibilidad de probarlos directamente desde la web