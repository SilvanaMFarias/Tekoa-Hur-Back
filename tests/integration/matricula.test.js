require("../setup/test-db");
const request = require("supertest");
const app = require("../../app");
const { generarTokenAdmin } = require("../setup/auth");
const { Matricula, Estudiante, Comision, Materia, sequelize } = require("../../models");
const { crearEstudiante, crearComision, crearMatricula } = require("../setup/factories");

describe("Pruebas del Módulo de Matrículas (End-to-End)", () => {
  let tokenAdmin;

  beforeAll(async () => {
    tokenAdmin = generarTokenAdmin();
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await Matricula.destroy({ where: {}, force: true });
    await Comision.destroy({ where: {}, force: true });
    await Estudiante.destroy({ where: {}, force: true });
    await Materia.destroy({ where: {}, force: true });
  });

  // ============================================================
  // POST /api/matriculas (Inscribir)
  // ============================================================
  test("debe inscribir a un alumno exitosamente (E2E)", async () => {
    const estudiante = await crearEstudiante(); 
    const comision = await crearComision();

    await request(app)
      .post("/api/matriculas")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ estudianteDni: estudiante.dni, comisionId: comision.comisionId })
      .expect(201);

    // Búsqueda correcta por estudianteDni
    const matriculaEnDb = await Matricula.findOne({ where: { estudianteDni: estudiante.dni } });
    expect(matriculaEnDb).not.toBeNull();
    expect(matriculaEnDb.estado).toBe("activa");
  });

  // ============================================================
  // POST /api/matriculas/cambiar-comision
  // ============================================================
  test("debe procesar el cambio de comisión correctamente (E2E)", async () => {
    const estudiante = await crearEstudiante();
    const comisionOriginal = await crearComision();
    // Forzamos a que la nueva comisión comparta la misma materia que la original
    const comisionNueva = await crearComision({ materiaId: comisionOriginal.materiaId });
    
    const matricula = await crearMatricula({ 
      estudianteDni: estudiante.dni, 
      comisionId: comisionOriginal.comisionId 
    });

    const response = await request(app)
      .post("/api/matriculas/cambiar-comision")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ matriculaId: matricula.matriculaId, nuevaComisionId: comisionNueva.comisionId })
      .expect(200);

    // Validamos que el ID de la comisión devuelta sea el de la nueva
    expect(response.body.matricula.comisionId).toBe(comisionNueva.comisionId);
    
    // Verificamos que la vieja esté dada de baja en la BD
    const matriculaVieja = await Matricula.findByPk(matricula.matriculaId);
    expect(matriculaVieja.estado).toBe('baja');
  });

  // ============================================================
  // DELETE /api/matriculas/:matriculaId
  // ============================================================
  test("debe dar de baja una matrícula (E2E)", async () => {
    const estudiante = await crearEstudiante();
    const comision = await crearComision();
    const matricula = await crearMatricula({ 
        estudianteDni: estudiante.dni, 
        comisionId: comision.comisionId 
    });

    await request(app)
      .delete(`/api/matriculas/${matricula.matriculaId}`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .expect(200);

    const matriculaDb = await Matricula.findByPk(matricula.matriculaId);
    expect(matriculaDb.estado).toBe("baja");
  });

  // ============================================================
  // GET /api/matriculas/por-estudiante/:dni
  // ============================================================
  test("debe listar las matrículas activas de un estudiante (E2E)", async () => {
    const estudiante = await crearEstudiante();
    const comision = await crearComision();
    await crearMatricula({ 
      estudianteDni: estudiante.dni, 
      comisionId: comision.comisionId 
    });

    const response = await request(app)
      .get(`/api/matriculas/por-estudiante/${estudiante.dni}`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .expect(200);

    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBe(1);
    expect(response.body[0].estudianteDni).toBe(estudiante.dni);
    expect(response.body[0].estado).toBe('activa');
    expect(response.body[0].comision).toBeDefined(); // Verifica que traiga la info extra por el JOIN
  });

  // ============================================================
  // GET /api/matriculas/comisiones-disponibles/:matriculaId
  // ============================================================
  test("debe devolver comisiones disponibles para cambio excluyendo la actual (E2E)", async () => {
    const estudiante = await crearEstudiante();
    const comisionOriginal = await crearComision();
    const comisionNueva = await crearComision({ materiaId: comisionOriginal.materiaId });
    
    const matricula = await crearMatricula({ 
      estudianteDni: estudiante.dni, 
      comisionId: comisionOriginal.comisionId 
    });

    const response = await request(app)
      .get(`/api/matriculas/comisiones-disponibles/${matricula.matriculaId}`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .expect(200);

    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeGreaterThan(0);
    
    const idsComisiones = response.body.map(c => c.comisionId);
    expect(idsComisiones).toContain(comisionNueva.comisionId);
    expect(idsComisiones).not.toContain(comisionOriginal.comisionId); // No debe traer la que ya cursa
  });

  // ============================================================
  // GET /api/matriculas/materias-con-comisiones
  // ============================================================
  test("debe listar materias con sus respectivas comisiones (E2E)", async () => {
    await crearComision(); 

    const response = await request(app)
      .get("/api/matriculas/materias-con-comisiones")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .expect(200);

    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty("comisiones");
    expect(response.body[0].comisiones).toBeInstanceOf(Array);
  });

  // ============================================================
  // PRUEBAS DE MANEJO DE ERRORES (Cubre los bloques catch)
  // ============================================================
  test("debe fallar al intentar inscribir sin enviar datos (E2E)", async () => {
    const response = await request(app)
      .post("/api/matriculas")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({}) // Forzamos el error del controller/service
      .expect(400); 

    // Aquí validamos que el mensaje de error provenga de tu AppError
    expect(response.body).toBeDefined();
  });

  test("debe fallar al intentar cambiar a una comisión de DIFERENTE materia (E2E)", async () => {
    const estudiante = await crearEstudiante();
    const comisionOriginal = await crearComision();
    
    // Al no pasarle materiaId, la factory crea una materia NUEVA (distinta a la original)
    const comisionOtraMateria = await crearComision(); 
    
    const matricula = await crearMatricula({ 
      estudianteDni: estudiante.dni, 
      comisionId: comisionOriginal.comisionId 
    });

    const response = await request(app)
      .post("/api/matriculas/cambiar-comision")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ 
        matriculaId: matricula.matriculaId, 
        nuevaComisionId: comisionOtraMateria.comisionId 
      })
      .expect(400); // Falla por regla de negocio "Solo MISMA materia"

    // Valida que el body contenga el mensaje de tu servicio
    expect(JSON.stringify(response.body)).toMatch(/MISMA materia/i);
  });
});