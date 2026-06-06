require("dotenv").config();

const sequelize = require("./config/database");
const app = require("./app");
const ausenciasAutomaticasService = require("./services/ausenciasAutomaticasService");

const port = process.env.PORT || 3001;

sequelize
.sync()
.then(() => {

    app.listen(port, () => {
        console.log(`✅  http://localhost:${port}`);
        console.log(`📄  http://localhost:${port}/api-docs`);
        ausenciasAutomaticasService.iniciar();
    });

})
.catch(err => {
    console.error("❌ Error DB:", err);
    process.exit(1);
});