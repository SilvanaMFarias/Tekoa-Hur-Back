require("../setup/test-db");
const ExcelJS = require("exceljs");
const request = require("supertest");
const app = require("../../app");
const { generarTokenAdmin } = require("../setup/auth");
const { HistorialImportacion, sequelize, Usuario } = require("../../models");
const { crearUsuario, crearHistorial } = require("../setup/factories");

describe("Pruebas E2E del Módulo de Historial de Importaciones", () => {
  let tokenAdmin;
  let usuarioAdmin;

  beforeAll(async () => {
    tokenAdmin = generarTokenAdmin();

    // Aseguramos sincronización limpia antes de empezar
    await sequelize.sync({ force: true });

    usuarioAdmin = await crearUsuario({ rol: "administrador" });

    console.log(
      "Usuario Admin creado con ID:",
      usuarioAdmin.usuarioId
    );

    // 🔍 Verificamos si realmente quedó en la BD
    const usuarioEnBD = await Usuario.findByPk(usuarioAdmin.usuarioId);

    console.log("Existe en BD:", !!usuarioEnBD);

    if (usuarioEnBD) {
      console.log(usuarioEnBD.toJSON());
    } else {
      console.log("❌ El usuario NO existe en la tabla usuarios");
    }
  });

  beforeEach(async () => {
    // Si el beforeEach global hizo sync({ force: true }),
    // recreamos el usuario para este test.
    const existe = await Usuario.findByPk(usuarioAdmin.usuarioId);

    if (!existe) {
      usuarioAdmin = await crearUsuario({
        rol: "administrador",
        usuarioId: usuarioAdmin.usuarioId, // mantener el mismo UUID
      });

      console.log("Usuario recreado:", usuarioAdmin.usuarioId);
    }

    await HistorialImportacion.destroy({
      where: {},
    });
  });

  describe("GET /api/historial-importaciones", () => {
    test("debe listar el historial real desde la BD", async () => {
      try {
        const adminId = usuarioAdmin.usuarioId;

        const usuarioEnBD = await Usuario.findByPk(adminId);

        console.log("Usuario antes del INSERT:", usuarioEnBD?.toJSON() || null);

        const historialCreado = await HistorialImportacion.create({
          origen: "DOCENTES",
          nombreArchivo: "docentes_2026.xlsx",
          usuarioId: adminId,
          fechaEjecucion: new Date(),
          archivo: Buffer.from("dummy"),
        });

        expect(historialCreado.historialId).toBeDefined();

        const response = await request(app)
          .get("/api/historial-importaciones")
          .set("Authorization", `Bearer ${tokenAdmin}`)
          .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0].nombreArchivo).toBe(
          "docentes_2026.xlsx"
        );
      } catch (err) {
        console.error("===== ERROR TEST LISTAR HISTORIAL =====");
        console.error("Nombre:", err.name);
        console.error("Mensaje:", err.message);

        if (err.parent) {
          console.error("Parent:", err.parent);
          console.error("Parent.message:", err.parent.message);
          console.error("Parent.detail:", err.parent.detail);
          console.error("Parent.constraint:", err.parent.constraint);
          console.error("Parent.code:", err.parent.code);
        }

        if (err.original) {
          console.error("Original:", err.original);
        }

        if (err.errors) {
          console.error("Errors:", err.errors);
        }

        throw err;
      }
    });
  });

  describe("GET /api/historial-importaciones/:historialId/archivo", () => {
    test("debe descargar el archivo real desde la BD", async () => {
      try {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("matriculacion");

        // Cabecera
        sheet.addRow(["DNI", "Nombre"]);

        // Una fila de ejemplo
        sheet.addRow(["12345678", "Juan"]);

        // Generar el archivo Excel en memoria
        const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

        const adminId = usuarioAdmin.getDataValue("usuarioId");

        const historial = await crearHistorial({
          origen: "COMISIONES",
          nombreArchivo: "comisiones_carga.xlsx",
          archivo: buffer,
          usuarioId: adminId,
        });


        const response = await request(app)
          .get(
            `/api/historial-importaciones/${historial.historialId}/archivo`
          )
          .set("Authorization", `Bearer ${tokenAdmin}`)
          .buffer(true)
          .parse((res, callback) => {
            const data = [];

            res.on("data", (chunk) => {
              data.push(chunk);
            });

            res.on("end", () => {
              callback(null, Buffer.concat(data));
            });
          })
          .expect(200);

        expect(response.headers["content-disposition"]).toContain(
          'filename="comisiones_carga.xlsx"'
        );

        // Verificar que el archivo devuelto sea un Excel válido
        const workbookDescargado = new ExcelJS.Workbook();
        await workbookDescargado.xlsx.load(response.body);

        const worksheet = workbookDescargado.getWorksheet("matriculacion");

        expect(worksheet).toBeDefined();

        // Se agregó la columna "Observación"
        expect(worksheet.getCell("A1").value).toBe("Observación");

        // Los datos originales siguen estando desplazados una columna
        expect(worksheet.getCell("B1").value).toBe("DNI");
        expect(worksheet.getCell("C1").value).toBe("Nombre");

      } catch (err) {
        console.error("===== ERROR TEST DESCARGAR ARCHIVO =====");
        console.error("Nombre:", err.name);
        console.error("Mensaje:", err.message);

        if (err.parent) {
          console.error("Parent:", err.parent);
        }

        throw err;
      }
    });

    test("debe retornar 404 si el historialId no existe", async () => {
      await request(app)
        .get(
          "/api/historial-importaciones/00000000-0000-0000-0000-000000000000/archivo"
        )
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .expect(404);
    });
  });
});