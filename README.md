# Tekoa-Hur-Back

### Primero instalar swagger
```bash
npm install swagger-jsdoc swagger-ui-express
```

### Luego para la base de datos:
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

## Probar swagger
```bash
node index.js
```
Abre tu navegador en: http://localhost:3001/api-docs
Se vera una interfaz interactiva con:
- Los endpoints como GET y POST
- La posibilidad de probarlos directamente desde la web

