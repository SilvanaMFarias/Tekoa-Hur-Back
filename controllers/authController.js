const jwt    = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Usuario, Estudiante, Profesor } = require("../models");

const JWT_SECRET  = process.env.JWT_SECRET  || "tekoa-hur-secret-cambiame";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "8h";
const SALT = 10;

// ══════════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════════

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { dni, password } = req.body;
    if (!dni || !password)
      return res.status(400).json({ message: "DNI y contraseña son requeridos." });

    const usuario = await Usuario.findOne({
      where: { dni: String(dni).trim(), activo: true },
    });
    if (!usuario)
      return res.status(401).json({ message: "DNI o contraseña incorrectos." });

    const ok = await bcrypt.compare(String(password), usuario.password);
    if (!ok)
      return res.status(401).json({ message: "DNI o contraseña incorrectos." });

    const payload = {
      usuarioId:    usuario.usuarioId,
      dni:          usuario.dni,
      nombre:       usuario.nombre,
      rol:          usuario.rol,
      referenciaId: usuario.referenciaId,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    return res.status(200).json({ token, usuario: payload });
  } catch (err) {
    console.error("Error login:", err);
    return res.status(500).json({ message: "Error interno del servidor." });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.usuario.usuarioId, {
      attributes: ["usuarioId", "dni", "nombre", "rol", "referenciaId", "activo"],
    });
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado." });
    return res.status(200).json(usuario);
  } catch (err) {
    return res.status(500).json({ message: "Error interno del servidor." });
  }
};

// PUT /api/auth/cambiar-password  (cualquier rol, propia cuenta)
exports.cambiarPassword = async (req, res) => {
  try {
    const { passwordActual, passwordNueva } = req.body;
    if (!passwordActual || !passwordNueva)
      return res.status(400).json({ message: "Completá ambos campos." });
    if (passwordNueva.length < 6)
      return res.status(400).json({ message: "La nueva contraseña debe tener al menos 6 caracteres." });

    const usuario = await Usuario.findByPk(req.usuario.usuarioId);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado." });

    const ok = await bcrypt.compare(String(passwordActual), usuario.password);
    if (!ok)
      return res.status(401).json({ message: "La contraseña actual es incorrecta." });

    usuario.password = await bcrypt.hash(String(passwordNueva), SALT);
    await usuario.save();
    return res.status(200).json({ message: "Contraseña actualizada correctamente." });
  } catch (err) {
    console.error("Error cambiarPassword:", err);
    return res.status(500).json({ message: "Error interno del servidor." });
  }
};

// ══════════════════════════════════════════════════════════════
//  GESTIÓN DE USUARIOS (solo administrador)
// ══════════════════════════════════════════════════════════════

// GET /api/auth/usuarios — lista todos los usuarios
exports.listarUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      attributes: ["usuarioId", "dni", "nombre", "rol", "referenciaId", "activo", "createdAt"],
      order: [["nombre", "ASC"]],
    });
    return res.status(200).json(usuarios);
  } catch (err) {
    return res.status(500).json({ message: "Error al obtener usuarios." });
  }
};

// POST /api/auth/usuarios — crear usuario manual
exports.crearUsuario = async (req, res) => {
  try {
    const { dni, nombre, password, rol, referenciaId } = req.body;
    if (!dni || !nombre || !password || !rol)
      return res.status(400).json({ message: "DNI, nombre, contraseña y rol son requeridos." });
    if (!["alumno", "docente", "administrador"].includes(rol))
      return res.status(400).json({ message: "Rol inválido. Debe ser: alumno, docente o administrador." });
    if (password.length < 6)
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres." });

    const existe = await Usuario.findOne({ where: { dni: String(dni).trim() } });
    if (existe)
      return res.status(409).json({ message: `Ya existe un usuario con DNI ${dni}.` });

    const usuario = await Usuario.create({
      dni:          String(dni).trim(),
      nombre:       String(nombre).trim(),
      password:     await bcrypt.hash(String(password), SALT),
      rol,
      referenciaId: referenciaId ? String(referenciaId).trim() : String(dni).trim(),
      activo:       true,
    });

    return res.status(201).json({
      message: "Usuario creado correctamente.",
      usuario: {
        usuarioId: usuario.usuarioId,
        dni:       usuario.dni,
        nombre:    usuario.nombre,
        rol:       usuario.rol,
        activo:    usuario.activo,
      },
    });
  } catch (err) {
    console.error("Error crearUsuario:", err);
    return res.status(500).json({ message: "Error al crear el usuario." });
  }
};

// PUT /api/auth/usuarios/:usuarioId — editar usuario
exports.editarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.usuarioId);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado." });

    const { nombre, rol, activo, passwordNueva } = req.body;

    if (nombre) usuario.nombre = String(nombre).trim();
    if (rol) {
      if (!["alumno", "docente", "administrador"].includes(rol))
        return res.status(400).json({ message: "Rol inválido." });
      usuario.rol = rol;
    }
    if (typeof activo === "boolean") usuario.activo = activo;
    if (passwordNueva) {
      if (passwordNueva.length < 6)
        return res.status(400).json({ message: "La nueva contraseña debe tener al menos 6 caracteres." });
      usuario.password = await bcrypt.hash(String(passwordNueva), SALT);
    }

    await usuario.save();
    return res.status(200).json({
      message: "Usuario actualizado correctamente.",
      usuario: {
        usuarioId: usuario.usuarioId,
        dni:       usuario.dni,
        nombre:    usuario.nombre,
        rol:       usuario.rol,
        activo:    usuario.activo,
      },
    });
  } catch (err) {
    console.error("Error editarUsuario:", err);
    return res.status(500).json({ message: "Error al actualizar el usuario." });
  }
};

// DELETE /api/auth/usuarios/:usuarioId — desactivar usuario (soft delete)
exports.desactivarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.usuarioId);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado." });

    // Proteger al admin principal
    if (usuario.dni === "00000001")
      return res.status(403).json({ message: "No se puede desactivar el administrador principal." });

    usuario.activo = false;
    await usuario.save();
    return res.status(200).json({ message: "Usuario desactivado correctamente." });
  } catch (err) {
    return res.status(500).json({ message: "Error al desactivar el usuario." });
  }
};

// POST /api/auth/usuarios/:usuarioId/reset-password — resetear contraseña a DNI
exports.resetPassword = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.usuarioId);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado." });

    usuario.password = await bcrypt.hash(usuario.dni, SALT);
    await usuario.save();
    return res.status(200).json({
      message: `Contraseña reseteada. La nueva contraseña es el DNI: ${usuario.dni}`,
    });
  } catch (err) {
    return res.status(500).json({ message: "Error al resetear la contraseña." });
  }
};

// ══════════════════════════════════════════════════════════════
//  SEEDS / UTILIDADES
// ══════════════════════════════════════════════════════════════

// POST /api/auth/seed — usuarios de prueba iniciales
exports.seedUsuarios = async (req, res) => {
  try {
    const defaults = [
      { dni: "00000001", nombre: "Administrador Sistema", password: await bcrypt.hash("admin123",   SALT), rol: "administrador", referenciaId: null },
      { dni: "00000002", nombre: "Docente Prueba",         password: await bcrypt.hash("docente123", SALT), rol: "docente",        referenciaId: "00000002" },
      { dni: "00000003", nombre: "Alumno Prueba",       password: await bcrypt.hash("alumno123",   SALT), rol: "alumno",         referenciaId: "00000003" },
    ];
    const creados = [];
    for (const u of defaults) {
      const [, created] = await Usuario.findOrCreate({ where: { dni: u.dni }, defaults: u });
      if (created) creados.push(u.dni);
    }
    return res.status(200).json({
      message: `Seed completado. Creados: ${creados.length}.`,
      credenciales: [
        { rol: "administrador", dni: "00000001", password: "admin123" },
        { rol: "docente",       dni: "00000002", password: "docente123" },
        { rol: "alumno",        dni: "00000003", password: "alumno123" },
      ],
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/seed-todos — crea usuarios para TODOS los alumnos/docentes existentes
// Contraseña inicial = DNI. No sobreescribe si ya existe.
exports.seedTodos = async (req, res) => {
  try {
    let estudiantesCreados = 0;
    let docentesCreados    = 0;

    const estudiantes = await Estudiante.findAll();
    for (const est of estudiantes) {
      const [, created] = await Usuario.findOrCreate({
        where:    { dni: est.dni },
        defaults: {
          dni:          est.dni,
          nombre:       est.nombre_apellido,
          password:     await bcrypt.hash(est.dni, SALT),
          rol:          "alumno",
          referenciaId: est.dni,
          activo:       true,
        },
      });
      if (created) estudiantesCreados++;
    }

    const profesores = await Profesor.findAll();
    for (const prof of profesores) {
      const [, created] = await Usuario.findOrCreate({
        where:    { dni: prof.dni },
        defaults: {
          dni:          prof.dni,
          nombre:       prof.nombre_apellido,
          password:     await bcrypt.hash(prof.dni, SALT),
          rol:          "docente",
          referenciaId: prof.dni,
          activo:       true,
        },
      });
      if (created) docentesCreados++;
    }

    return res.status(200).json({
      message: `Usuarios creados: ${estudiantesCreados} alumnos, ${docentesCreados} docentes.`,
      estudiantesCreados,
      docentesCreados,
      nota: "Contraseña inicial = DNI de cada uno.",
    });
  } catch (err) {
    console.error("Error en seed-todos:", err);
    return res.status(500).json({ message: err.message });
  }
};
