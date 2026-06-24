require("../setup/test-db");

const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = require("../../app");
const { Usuario } = require("../../models");

// Traemos todas las factories necesarias para las pruebas
const { crearUsuario, crearEstudiante, crearProfesor } = require("../setup/factories");

const JWT_SECRET = process.env.JWT_SECRET || "tekoa-hur-secret-cambiame";

describe("Auth & User Management Integration", () => {
  let tokenAdmin;
  let adminDb;

  beforeEach(async () => {
    await Usuario.destroy({ where: {}, truncate: true, cascade: true });

    // Forzamos un DNI limpio y activo en true explícito para el login
    adminDb = await Usuario.create({
      dni: "12345678",
      nombre: "Administrador Test",
      password: await bcrypt.hash("admin123", 10), // Lo hasheamos directamente acá para asegurar consistencia absoluta en el login
      rol: "administrador",
      referenciaId: "12345678",
      activo: true,
      cambioPasswordObligatorio: false
    });

    const payload = {
      usuarioId: adminDb.usuarioId,
      dni: adminDb.dni,
      nombre: adminDb.nombre,
      rol: adminDb.rol,
      referenciaId: adminDb.referenciaId,
      cambioPasswordObligatorio: adminDb.cambioPasswordObligatorio,
    };

    tokenAdmin = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
  });

  // ══════════════════════════════════════════════════════════════
  // FLUJO DE AUTENTICACIÓN (LOGIN)
  // ══════════════════════════════════════════════════════════════
  describe("POST /api/auth/login", () => {
    it("debería loguear correctamente con credenciales válidas", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          dni: "12345678",
          password: "admin123",
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body.usuario).toMatchObject({
        dni: "12345678",
        rol: "administrador",
      });
    });

    it("debería rechazar contraseña incorrecta con 401", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          dni: "12345678",
          password: "incorrecta",
        });

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toContain("incorrectos");
    });

    it("debería rechazar usuario inexistente con 401", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          dni: "99999999",
          password: "admin123",
        });

      expect(response.statusCode).toBe(401);
    });

    it("debería validar campos requeridos con 400", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({});

      expect(response.statusCode).toBe(400);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // GESTIÓN DE USUARIOS
  // ══════════════════════════════════════════════════════════════
  describe("POST /api/auth/usuarios (Crear Usuario Manual)", () => {
    it("debería permitir al administrador crear un usuario y forzar el cambioPasswordObligatorio", async () => {
      const payloadNuevoUsuario = {
        dni: "22222222",
        nombre: "Docente Nuevo Test",
        password: "passwordSeguro123",
        rol: "docente"
      };

      const response = await request(app)
        .post("/api/auth/usuarios")
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .send(payloadNuevoUsuario);

      expect(response.statusCode).toBe(201);
      expect(response.body.message).toBe("Usuario creado correctamente.");

      const usuarioDb = await Usuario.findOne({ where: { dni: "22222222" } });
      expect(usuarioDb).not.toBeNull();
      expect(usuarioDb.cambioPasswordObligatorio).toBe(true);
    });

    it("debería retornar 409 si el DNI que se intenta registrar ya existe", async () => {
      await crearUsuario({ dni: "33333333", rol: "alumno" });

      const response = await request(app)
        .post("/api/auth/usuarios")
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .send({
          dni: "33333333",
          nombre: "Estudiante Clon",
          password: "password123",
          rol: "alumno"
        });

      expect(response.statusCode).toBe(409);
    });

    it("debería retornar 400 si la longitud de la contraseña es menor a 6 caracteres", async () => {
      const response = await request(app)
        .post("/api/auth/usuarios")
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .send({
          dni: "44444444",
          nombre: "Clave Debil",
          password: "123",
          rol: "alumno"
        });

      expect(response.statusCode).toBe(400);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // RESET DE CONTRASEÑA
  // ══════════════════════════════════════════════════════════════
  describe("POST /api/auth/usuarios/:usuarioId/reset", () => {
    it("debería cambiar la contraseña al DNI del usuario y forzar el flag de cambio obligatorio", async () => {
      const usuarioObjetivo = await crearUsuario({ 
        dni: "55555555", 
        password: "claveSuperComplejaOriginal",
        cambioPasswordObligatorio: false 
      });

      const idParaRuta = usuarioObjetivo.usuarioId || usuarioObjetivo.id || usuarioObjetivo.dni;

      const response = await request(app)
        .post(`/api/auth/usuarios/${idParaRuta}/reset`)
        .set("Authorization", `Bearer ${tokenAdmin}`);

      if (response.statusCode !== 200) {
        console.log("DEBUG RESEPASSWORD -> ID enviado:", idParaRuta);
        console.log("DEBUG RESEPASSWORD -> Body recibido:", response.body);
      }

      expect(response.statusCode).toBe(200);

      const usuarioDb = await Usuario.findByPk(idParaRuta);
      expect(usuarioDb.cambioPasswordObligatorio).toBe(true);

      const esClaveIgualAlDni = await bcrypt.compare("55555555", usuarioDb.password);
      expect(esClaveIgualAlDni).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // BAJA LOGICA (SOFT DELETE)
  // ══════════════════════════════════════════════════════════════
  describe("DELETE /api/auth/usuarios/:usuarioId", () => {
    it("debería aplicar soft-delete modificando el flag 'activo' a false", async () => {
      const usuarioABajar = await crearUsuario({ activo: true });

      const response = await request(app)
        .delete(`/api/auth/usuarios/${usuarioABajar.usuarioId}`)
        .set("Authorization", `Bearer ${tokenAdmin}`);

      expect(response.statusCode).toBe(200);

      const usuarioDb = await Usuario.findByPk(usuarioABajar.usuarioId);
      expect(usuarioDb.activo).toBe(false);
    });

    it("debería impedir la desactivación del administrador principal (DNI 00000001)", async () => {
      const adminPrincipal = await crearUsuario({ dni: "00000001", rol: "administrador" });

      const response = await request(app)
        .delete(`/api/auth/usuarios/${adminPrincipal.usuarioId}`)
        .set("Authorization", `Bearer ${tokenAdmin}`);

      expect(response.statusCode).toBe(403);

      const usuarioDb = await Usuario.findByPk(adminPrincipal.usuarioId);
      expect(usuarioDb.activo).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // EDICIÓN DE USUARIOS
  // ══════════════════════════════════════════════════════════════
  describe("PUT /api/auth/usuarios/:usuarioId (Editar Usuario)", () => {
    it("debería actualizar los campos básicos de un usuario correctamente", async () => {
      const usuarioOriginal = await crearUsuario({
        nombre: "Nombre Original",
        rol: "alumno",
        activo: true
      });

      const response = await request(app)
        .put(`/api/auth/usuarios/${usuarioOriginal.usuarioId}`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .send({
          nombre: "  Nombre Modificado   ", 
          rol: "docente",
          activo: false
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.usuario).toMatchObject({
        nombre: "Nombre Modificado",
        rol: "docente",
        activo: false
      });

      const usuarioDb = await Usuario.findByPk(usuarioOriginal.usuarioId);
      expect(usuarioDb.nombre).toBe("Nombre Modificado");
      expect(usuarioDb.rol).toBe("docente");
      expect(usuarioDb.activo).toBe(false);
    });

    it("debería permitir cambiar la contraseña si cumple con el mínimo de caracteres", async () => {
      const usuarioOriginal = await crearUsuario({ dni: "44112233" });

      const response = await request(app)
        .put(`/api/auth/usuarios/${usuarioOriginal.usuarioId}`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .send({
          passwordNueva: "nuevaClave123"
        });

      expect(response.statusCode).toBe(200);

      const usuarioDb = await Usuario.findByPk(usuarioOriginal.usuarioId);
      const passwordActualizada = await bcrypt.compare("nuevaClave123", usuarioDb.password);
      expect(passwordActualizada).toBe(true);
    });

    it("debería retornar 400 si se envía un rol inválido", async () => {
      const usuarioOriginal = await crearUsuario({ rol: "alumno" });

      const response = await request(app)
        .put(`/api/auth/usuarios/${usuarioOriginal.usuarioId}`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .send({
          rol: "super-admin-falso"
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toContain("Rol inválido");
    });

    it("debería retornar 400 si la nueva contraseña tiene menos de 6 caracteres", async () => {
      const usuarioOriginal = await crearUsuario({ rol: "alumno" });

      const response = await request(app)
        .put(`/api/auth/usuarios/${usuarioOriginal.usuarioId}`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .send({
          passwordNueva: "12345"
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toContain("al menos 6 caracteres");
    });

    it("debería retornar 404 si el usuarioId no existe en el sistema", async () => {
      const response = await request(app)
        .put("/api/auth/usuarios/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .send({
          nombre: "Nadie"
        });

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toContain("Usuario no encontrado");
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SEED DE USUARIOS BASE (DEFAULT) - SE DETECTA QUE NO LLEVA TOKEN
  // ══════════════════════════════════════════════════════════════
  describe("POST /api/auth/seed", () => {
    it("debería ejecutar el findOrCreate para los 3 usuarios por defecto", async () => {
      const response = await request(app)
        .post("/api/auth/seed"); // Removido .set("Authorization") ya que la ruta es pública en routes/auth.js

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toContain("Seed completado");
      expect(response.body).toHaveProperty("credenciales");

      const adminSeed = await Usuario.findOne({ where: { dni: "00000001" } });
      const docenteSeed = await Usuario.findOne({ where: { dni: "00000002" } });
      const alumnoSeed = await Usuario.findOne({ where: { dni: "00000003" } });

      expect(adminSeed).not.toBeNull();
      expect(docenteSeed).not.toBeNull();
      expect(alumnoSeed).not.toBeNull();

      expect(adminSeed.rol).toBe("administrador");
      expect(docenteSeed.rol).toBe("docente");
      expect(alumnoSeed.rol).toBe("alumno");
    });

    it("no debería duplicar usuarios ni fallar si se ejecuta el seed dos veces consecutivas", async () => {
      await request(app).post("/api/auth/seed");
      
      const response = await request(app)
        .post("/api/auth/seed");

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toContain("Creados: 0");
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SEED COMPLETO DESDE PADRONES - SE DETECTA QUE NO LLEVA TOKEN
  // ══════════════════════════════════════════════════════════════
  describe("POST /api/auth/seed-todos", () => {
    const { Estudiante, Profesor } = require("../../models");

    beforeEach(async () => {
      await Estudiante.destroy({ where: {}, truncate: true, cascade: true });
      await Profesor.destroy({ where: {}, truncate: true, cascade: true });
    });

    it("debería migrar los registros del padrón de Estudiantes y Profesores a la tabla Usuarios", async () => {
      await crearEstudiante({ dni: "44445555", nombre_apellido: "García Juan" });
      await crearEstudiante({ dni: "44446666", nombre_apellido: "Pérez María" });
      await crearProfesor({ dni: "11112222", nombre_apellido: "Martínez Carlos" });

      const response = await request(app)
        .post("/api/auth/seed-todos"); // Removido .set("Authorization") ya que la ruta es pública en routes/auth.js

      expect(response.statusCode).toBe(200);
      expect(response.body.estudiantesCreados).toBe(2);
      expect(response.body.docentesCreados).toBe(1);

      const usuarioEstudiante = await Usuario.findOne({ where: { dni: "44445555" } });
      expect(usuarioEstudiante).not.toBeNull();
      expect(usuarioEstudiante.rol).toBe("alumno");
      expect(usuarioEstudiante.cambioPasswordObligatorio).toBe(true);
      expect(usuarioEstudiante.activo).toBe(true);

      const passwordCorrecta = await bcrypt.compare("44445555", usuarioEstudiante.password);
      expect(passwordCorrecta).toBe(true);

      const usuarioDocente = await Usuario.findOne({ where: { dni: "11112222" } });
      expect(usuarioDocente).not.toBeNull();
      expect(usuarioDocente.rol).toBe("docente");
    });
  });

});