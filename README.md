# Tekoa-Hur-Back


### - Instalar dependencias para sequelize
npm install sequelize pg pg-hstore

npm install --save-dev sequelize-cli

### - Crear la DB
npx sequelize-cli db:create

### - Crear las tablas de acuerdo a los models
node sync.js

## -Para correr los seeders instalar UUID
npm install uuid

### Ejecutar los seeders
npx sequelize-cli db:seed:all

## Probar swagger
```bash
node index.js
```
Abre tu navegador en: http://localhost:3001/api-docs
Se vera una interfaz interactiva con:
- Los endpoints como GET y POST
- La posibilidad de probarlos directamente desde la web

