# Tekoa-Hur-Back

## iniciar proyecto
npm run dev

### - Instalar dependencias para sequelize
npm install sequelize pg pg-hstore

npm install --save-dev sequelize-cli

### - Inicializar Sequelize
npx sequelize-cli init

### - Crear la DB
npx sequelize-cli db:create

### - Crear las tablas de acuerdo a los models
node sync.js