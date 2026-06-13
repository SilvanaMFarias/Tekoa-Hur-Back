const request = require("supertest");
const app = require("../../app");
const { Usuario } = require("../../models");
const bcrypt = require("bcryptjs");
const transporter = require("../../config/mailer");

// Mockear el transporter de nodemailer para interceptar los correos
jest.mock("../../config/mailer", () => ({
  sendMail: jest.fn().mockResolvedValue({ messageId: "mock-id-12345" })
}));

describe("Pruebas de Integración Reales - Recuperación de Contraseña", () => {
  const SALT = 10;
  let usuarioBase;

  // En lugar de hacer force:true por cada test, limpiamos solo los registros de la tabla
  beforeEach(async () => {
    jest.clearAllMocks();

    // 1. Forzar limpieza limpia de filas para evitar locks de Postgres
    await Usuario.destroy({ where: {}, cascade: true, force: true });

    // 2. Insertar el usuario de prueba con un DNI único por iteración
    const idUnico = Math.floor(Math.random() * 1000000);
    
    usuarioBase = await Usuario.create({
      dni: String(idUnico).padStart(8, "0"),
      nombre: "Tomás Miranda", 
      email: `tomas.${idUnico}@test.com`, // Email dinámico único para evitar colisiones Unique
      password: await bcrypt.hash("Password123!", SALT),
      rol: "alumno", 
      estado: "AUSENTE", 
      activo: true,
      cambioPasswordObligatorio: true
    });
  });

  // ============================================================================
  // 1. POST /api/auth/forgot-password
  // ============================================================================
  describe("POST /api/auth/forgot-password", () => {
    it("debería generar token, guardarlo hasheado y enviar el correo con el link correcto", async () => {
      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: usuarioBase.email }) // Usar el email generado dinámicamente
        .expect(200);

      expect(res.body.message).toMatch(/si el email se encuentra registrado/i);

      const usuarioActualizado = await Usuario.findByPk(usuarioBase.usuarioId);
      expect(usuarioActualizado.resetPasswordToken).not.toBeNull();
      expect(usuarioActualizado.resetPasswordExpires).toBeInstanceOf(Date);

      expect(transporter.sendMail).toHaveBeenCalledTimes(1);
      const emailArgs = transporter.sendMail.mock.calls[0][0];
      expect(emailArgs.to).toBe(usuarioBase.email);
      expect(emailArgs.html).toContain(`email=${usuarioBase.email}`);
    });

    it("debería devolver 200 con mensaje genérico si el email no existe (Mitigación de Enumeración)", async () => {
      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "inexistente@correo.com" })
        .expect(200);

      expect(res.body.message).toMatch(/si el email se encuentra registrado/i);
      expect(transporter.sendMail).not.toHaveBeenCalled();
    });

    it("debería retornar 400 si no se envía la propiedad email en el body", async () => {
      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({})
        .expect(400);

      expect(res.body.message).toMatch(/el email es requerido/i);
    });
  });

  // ============================================================================
  // 2. POST /api/auth/validate-reset-token
  // ============================================================================
  describe("POST /api/auth/validate-reset-token", () => {
    it("debería validar exitosamente un token correcto y no expirado devolviendo el nombre del usuario", async () => {
      const tokenPlano = "token-seguro-1234";
      const tokenHasheado = await bcrypt.hash(tokenPlano, SALT);
      
      await usuarioBase.update({
        resetPasswordToken: tokenHasheado,
        resetPasswordExpires: new Date(Date.now() + 30 * 60 * 1000)
      });

      const res = await request(app)
        .post("/api/auth/validate-reset-token")
        .send({
          email: usuarioBase.email,
          token: tokenPlano
        })
        .expect(200);

      expect(res.body.valid).toBe(true);
      expect(res.body.nombre).toBe("Tomás Miranda");
    });

    it("debería rebotar con 400 si el token ya expiró en el tiempo", async () => {
      const tokenPlano = "token-expirado";
      const tokenHasheado = await bcrypt.hash(tokenPlano, SALT);

      await usuarioBase.update({
        resetPasswordToken: tokenHasheado,
        resetPasswordExpires: new Date(Date.now() - 1000)
      });

      const res = await request(app)
        .post("/api/auth/validate-reset-token")
        .send({
          email: usuarioBase.email,
          token: tokenPlano
        })
        .expect(400);

      expect(res.body.valid).toBe(false);
      expect(res.body.message).toMatch(/el enlace expiró/i);
    });

    it("debería retornar 400 si el token plano fue alterado o no coincide con el hash", async () => {
      await usuarioBase.update({
        resetPasswordToken: await bcrypt.hash("token-original", SALT),
        resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000)
      });

      const res = await request(app)
        .post("/api/auth/validate-reset-token")
        .send({
          email: usuarioBase.email,
          token: "token-invalido-modificado"
        })
        .expect(400);

      expect(res.body.valid).toBe(false);
      expect(res.body.message).toMatch(/el enlace es inválido/i);
    });
  });

  // ============================================================================
  // 3. POST /api/auth/reset-password
  // ============================================================================
  describe("POST /api/auth/reset-password", () => {
    it("debería actualizar la contraseña, limpiar los campos del token y desactivar el cambio obligatorio", async () => {
      const tokenPlano = "token-exitoso";
      const tokenHasheado = await bcrypt.hash(tokenPlano, SALT);

      await usuarioBase.update({
        resetPasswordToken: tokenHasheado,
        resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000)
      });

      const nuevaPasswordPlana = "NuevaClaveSegura2026!";

      const res = await request(app)
        .post("/api/auth/reset-password")
        .send({
          email: usuarioBase.email,
          token: tokenPlano,
          password: nuevaPasswordPlana
        })
        .expect(200);

      expect(res.body.message).toMatch(/contraseña actualizada correctamente/i);

      await usuarioBase.reload();

      expect(usuarioBase.resetPasswordToken).toBeNull();
      expect(usuarioBase.resetPasswordExpires).toBeNull();
      expect(usuarioBase.cambioPasswordObligatorio).toBe(false);

      const matchesNuevaClave = await bcrypt.compare(nuevaPasswordPlana, usuarioBase.password);
      expect(matchesNuevaClave).toBe(true);
    });

    it("debería rechazar el reseteo con 400 si el email no coincide con ninguna cuenta activa", async () => {
      const res = await request(app)
        .post("/api/auth/reset-password")
        .send({
          email: "email.incorrecto@test.com",
          token: "algun-token",
          password: "PasswordModificada1!"
        })
        .expect(400);

      expect(res.body.message).toMatch(/token inválido/i);
    });
  });
});