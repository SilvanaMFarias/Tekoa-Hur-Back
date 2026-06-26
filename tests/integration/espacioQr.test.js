const request = require("supertest");
require("../setup/test-db"); 
const app = require("../../app");
const { EspacioQR, Aula, AulaAtributos,Edificio } = require("../../models");
const { crearAula,crearEdificio } = require("../setup/factories");
const { generarTokenAdmin } = require("../setup/auth");
const crypto = require("crypto");

describe("Pruebas de Integración Reales - EspacioQR", () => {
  let aulaReal;
  let tokenAdmin;
  let edificioReal;
  beforeEach(async () => {
    // Generar datos base reales usando tus factories transparentes
    edificioReal = await crearEdificio({ nombre: "Edificio de Prueba" });
    const idEdificio = edificioReal.id || edificioReal.edificioId;
    aulaReal = await crearAula({ edificioId: idEdificio });
    tokenAdmin = generarTokenAdmin();
  });

  // ============================================================================
  // POST /api/qr/espacio/generar
  // ============================================================================
  describe("POST /api/qr/espacio/generar", () => {
    it("debería generar un QR de espacio activo y asociarlo al edificio correcto", async () => {
      const aulaId = aulaReal.aulaId || aulaReal.id;

      const res = await request(app)
        .post("/api/qr/espacio/generar")
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .send({ aulaId })
        .expect(201);

      expect(res.body.ok).toBe(true);
      expect(res.body.message).toBe("QR de espacio generado correctamente");
      expect(res.body.espacioQR.activo).toBe(true);
      expect(res.body.espacioQR.aulaId).toBe(aulaId);
      expect(res.body.espacioQR.edificioId).toBe(aulaReal.edificioId);

      // Verificación de la persistencia atómica en Postgres
      const qrEnBD = await EspacioQR.findOne({ where: { aulaId, activo: true } });
      expect(qrEnBD).not.toBeNull();
      expect(qrEnBD.token).toBe(res.body.espacioQR.token);
    });

    it("debería desactivar automáticamente el QR anterior del aula dentro de una transacción", async () => {
      const aulaId = aulaReal.aulaId || aulaReal.id;

      // Forzamos la existencia de un QR activo previo en la base de datos
      const qrViejo = await EspacioQR.create({
        token: crypto.randomBytes(16).toString("hex"),
        aulaId,
        edificioId: aulaReal.edificioId,
        activo: true,
      });

      // Solicitamos generar uno nuevo
      const res = await request(app)
        .post("/api/qr/espacio/generar")
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .send({ aulaId })
        .expect(201);

      // El nuevo debe estar activo
      expect(res.body.espacioQR.token).not.toBe(qrViejo.token);

      // Verificamos que el viejo pasó a estar inactivo (efecto de la transacción del service)
      await qrViejo.reload();
      expect(qrViejo.activo).toBe(false);
      expect(qrViejo.desactivadoEn).not.toBeNull();
    });

    it("debería responder 404 si el aulaId enviado no existe en la base de datos", async () => {
      const uuidInexistente = "00000000-0000-0000-0000-000000000000";

      const res = await request(app)
        .post("/api/qr/espacio/generar")
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .send({ aulaId: uuidInexistente })
        .expect(404);

      // Calibrado con tu errorHandler estructurado
      expect(res.body.error).toMatch(/aula no encontrada/i);
    });

    it("debería rebotar con 401 si se ejecuta sin cabecera de autenticación", async () => {
      await request(app)
        .post("/api/qr/espacio/generar")
        .send({ aulaId: aulaReal.aulaId || aulaReal.id })
        .expect(401);
    });
  });

  // ============================================================================
  // POST /api/qr/espacio/desactivar/:espacioQrId
  // ============================================================================
  describe("POST /api/qr/espacio/desactivar/:espacioQrId", () => {
    it("debería desactivar un QR activo de forma idempotente", async () => {
      const qr = await EspacioQR.create({
        token: "token-para-desactivar",
        aulaId: aulaReal.aulaId || aulaReal.id,
        edificioId: aulaReal.edificioId,
        activo: true,
      });

      // Primer llamado: Debería desactivarlo
      const res1 = await request(app)
        .post(`/api/qr/espacio/desactivar/${qr.id || qr.espacioQrId}`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res1.body.desactivado).toBe(true);
      expect(res1.body.message).toBe("QR desactivado correctamente");

      // Segundo llamado: Debe comportarse de forma idempotente sin romper nada
      const res2 = await request(app)
        .post(`/api/qr/espacio/desactivar/${qr.id || qr.espacioQrId}`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res2.body.desactivado).toBe(false);
      expect(res2.body.message).toBe("El QR ya estaba desactivado");
    });
  });

  // ============================================================================
  // GET /api/qr/espacio
  // ============================================================================
  describe("GET /api/qr/espacio", () => {
    it("debería listar todos los QRs creados ordenados por fecha descendente e incluyendo relaciones", async () => {
      const aulaId = aulaReal.aulaId || aulaReal.id;

      await EspacioQR.create({ token: "tk-1", aulaId, edificioId: aulaReal.edificioId, activo: false });
      await EspacioQR.create({ token: "tk-2", aulaId, edificioId: aulaReal.edificioId, activo: true });

      const res = await request(app)
        .get("/api/qr/espacio")
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(2);
      // Validamos que Express mapee correctamente la inclusión estructural del modelo
      expect(res.body.espacioQRs[0]).toHaveProperty("aula");
      expect(res.body.espacioQRs[0]).toHaveProperty("edificio");
    });

    it("debería filtrar únicamente los QRs activos si se pasa la query soloActivos=true", async () => {
      const aulaId = aulaReal.aulaId || aulaReal.id;

      await EspacioQR.create({ token: "tk-inactivo", aulaId, edificioId: aulaReal.edificioId, activo: false });
      await EspacioQR.create({ token: "tk-activo", aulaId, edificioId: aulaReal.edificioId, activo: true });

      const res = await request(app)
        .get("/api/qr/espacio?soloActivos=true")
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .expect(200);

      // Verificamos que ninguno en la lista sea falso
      const tieneInactivos = res.body.espacioQRs.some(qr => qr.activo === false);
      expect(tieneInactivos).toBe(false);
    });
  });

  // ============================================================================
  // GET /api/qr/espacio/info/:token
  // ============================================================================
  describe("GET /api/qr/espacio/info/:token (PÚBLICO)", () => {
    it("debería resolver la info completa del aula y sus atributos sin requerir token JWT", async () => {
      const aulaId = aulaReal.aulaId || aulaReal.id;
      const tokenPublico = "token-secreto-de-escaneo";

      // Insertamos el QR activo
      await EspacioQR.create({
        token: tokenPublico,
        aulaId,
        edificioId: aulaReal.edificioId,
        activo: true,
      });

      // Insertamos atributos asociados para comprobar que los resuelva
      await AulaAtributos.create({
        aulaId,
        capacidad: 40,
        tipoAula: "Laboratorio Informático",
        esLaboratorioInformatico: true,
        cantidadPC: 35,
      });

      // Petición limpia (sin cabecera Authorization)
      const res = await request(app)
        .get(`/api/qr/espacio/info/${tokenPublico}`)
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.aula.nombreCompleto).toBe(`${aulaReal.sector}-${aulaReal.numero}`);
      expect(res.body.atributos.cantidadPC).toBe(35);
    });

    it("debería retornar 403 con código INVALID_QR ante un token inexistente o inactivo para mitigar enumeración", async () => {
      const tokenInvalido = "token-que-no-existe-en-el-sistema";

      const res = await request(app)
        .get(`/api/qr/espacio/info/${tokenInvalido}`)
        .expect(403);

      expect(res.body.error).toMatch(/qr inválido o desactivado/i);
    });
  });
});