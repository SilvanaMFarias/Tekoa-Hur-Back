const request = require("supertest");
const app = require("../../app");
const { AulaAtributos, Aula } = require("../../models");
const { crearAula } = require("../setup/factories"); 
const { generarTokenAdmin } = require("../setup/auth");

describe("Pruebas de Integración Reales - AulaAtributos", () => {
  let aulaReal;
  let tokenAdmin;

  beforeEach(async () => {
    // Generamos el token real de administrador para las peticiones protegidas
    tokenAdmin = generarTokenAdmin();

    // Usamos factory real que crea el Edificio y el Aula de forma consistente en la DB de pruebas
    aulaReal = await crearAula();
  });

  // ============================================================================
  // GET /api/aulas/:aulaId/atributos
  // ============================================================================
  describe("GET /api/aulas/:aulaId/atributos", () => {
    it("debería retornar 200 y null si el aula existe pero no posee atributos configurados", async () => {
      const res = await request(app)
        .get(`/api/aulas/${aulaReal.id || aulaReal.aulaId}/atributos`)
        .set("Authorization", `Bearer ${tokenAdmin}`) // jwtAuth lo exige en tus rutas
        .expect(200);

      expect(res.body).toEqual({
        ok: true,
        atributos: null,
      });
    });

    it("debería retornar 200 junto con los atributos si ya están persistidos en la base de datos", async () => {
      // Impactamos directamente la BD de pruebas asociada al aula de la factory
      await AulaAtributos.create({
        aulaId: aulaReal.id || aulaReal.aulaId,
        capacidad: 45,
        tipoAula: "Laboratorio",
        esLaboratorioInformatico: true,
        cantidadPC: 40,
      });

      const res = await request(app)
        .get(`/api/aulas/${aulaReal.id || aulaReal.aulaId}/atributos`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.atributos.cantidadPC).toBe(40);
      expect(res.body.atributos.tipoAula).toBe("Laboratorio");
    });

    it("debería rebotar con 401 si se intenta consultar sin el token de autenticación", async () => {
      await request(app)
        .get(`/api/aulas/${aulaReal.id || aulaReal.aulaId}/atributos`)
        // Omitimos la cabecera Authorization intencionalmente
        .expect(401);
    });

    it("debería retornar 404 a través del asyncHandler si el id de aula no existe en el sistema", async () => {
      const uuidInexistente = "00000000-0000-0000-0000-000000000000";

      const res = await request(app)
        .get(`/api/aulas/${uuidInexistente}/atributos`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .expect(404);

      // CORREGIDO: res.body.error en lugar de res.body.message
      expect(res.body.error).toMatch(/aula no encontrada/i);
    });
  });

  // ============================================================================
  // PUT /api/aulas/:aulaId/atributos
  // ============================================================================
  describe("PUT /api/aulas/:aulaId/atributos", () => {
    const payloadValido = {
      capacidad: 35,
      tipoAula: "Teórica",
      esLaboratorioInformatico: false,
      equipamiento: ["Pizarra", "Proyector HDMI"],
    };

    it("debería crear los atributos por primera vez usando el UPSERT atómico", async () => {
      const res = await request(app)
        .put(`/api/aulas/${aulaReal.id || aulaReal.aulaId}/atributos`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .send(payloadValido)
        .expect(200);

      expect(res.body).toEqual({
        ok: true,
        message: "Atributos guardados correctamente",
        atributos: expect.objectContaining({
          capacidad: 35,
          tipoAula: "Teórica",
        }),
      });

      // Confirmación de la persistencia atómica real en Postgres
      const enBD = await AulaAtributos.findByPk(aulaReal.id || aulaReal.aulaId);
      expect(enBD).not.toBeNull();
      expect(enBD.tipoAula).toBe("Teórica");
    });

    it("debería aplicar la normalización defensiva del service (cantidadPC = null) si esLaboratorioInformatico es false", async () => {
      const payloadInconsistente = {
        esLaboratorioInformatico: false,
        cantidadPC: 30, // Conflicto: dice que no es lab pero manda PCs
        tipoAula: "Común",
      };

      const res = await request(app)
        .put(`/api/aulas/${aulaReal.id || aulaReal.aulaId}/atributos`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .send(payloadInconsistente)
        .expect(200);

      // El service debió haber limpiado el campo cantidadPC poniéndolo en null
      expect(res.body.atributos.cantidadPC).toBeNull();

      const registroGuardado = await AulaAtributos.findByPk(aulaReal.id || aulaReal.aulaId);
      expect(registroGuardado.cantidadPC).toBeNull();
    });

    it("debería retornar 400 si el administrador ingresa una capacidad con valor negativo", async () => {
      const res = await request(app)
        .put(`/api/aulas/${aulaReal.id || aulaReal.aulaId}/atributos`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .send({ capacidad: -15 })
        .expect(400);

      // CORREGIDO: res.body.error en lugar de res.body.message
      expect(res.body.error).toMatch(/la capacidad no puede ser negativa/i);
    });
  });

  // ============================================================================
  // DELETE /api/aulas/:aulaId/atributos
  // ============================================================================
  describe("DELETE /api/aulas/:aulaId/atributos", () => {
    it("debería borrar los registros de atributos pero mantener intacta la entidad Aula en la BD", async () => {
      const aulaId = aulaReal.id || aulaReal.aulaId;

      // Generamos los atributos directo en la BD
      await AulaAtributos.create({
        aulaId,
        capacidad: 60,
      });

      const res = await request(app)
        .delete(`/api/aulas/${aulaId}/atributos`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body.message).toBe("Atributos eliminados");

      // Verificaciones en la base de datos real
      const existAtributos = await AulaAtributos.findByPk(aulaId);
      expect(existAtributos).toBeNull(); // Se borró

      const existeAulaPadre = await Aula.findByPk(aulaId);
      expect(existeAulaPadre).not.toBeNull(); // El aula padre sigue viva
    });

    it("debería retornar un mensaje coherente si el aula existe pero no tenía atributos previos", async () => {
      const res = await request(app)
        .delete(`/api/aulas/${aulaReal.id || aulaReal.aulaId}/atributos`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body.message).toBe("El aula no tenía atributos cargados");
    });
  });
});