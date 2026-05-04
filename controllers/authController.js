const jwt     = require("jsonwebtoken");
const bcrypt  = require("bcryptjs");
const { Usuario } = require("../models");

const JWT_SECRET  = process.env.JWT_SECRET  || "tekoa-hur-secret-cambiame";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "8h"; // duración del token

/**
 * POST /api/auth/login
 * Body: { dni, password }
 *
 * Devuelve: { token, usuario: { usuarioId, dni, nombre, rol } }
 */
exports.login = async (req, res) => {
  try {
    const { dni, password } = req.body;

    if (!dni || !password) {
      return res.status(400).json({ message: "DNI y contraseña son requeridos." });
    }

    // Buscar usuario activo
    const usuario = await Usuario.findOne({
      where: { dni: String(dni).trim(), activo: true },
    });

    if (!usuario) {
      return res.status(401).json({ message: "DNI o contraseña incorrectos." });
    }

    // Verificar contraseña contra el hash bcrypt
    const passwordOk = await bcrypt.compare(String(password), usuario.password);
    if (!passwordOk) {
      return res.status(401).json({ message: "DNI o contraseña incorrectos." });
    }

    // Generar JWT con datos del usuario
    const payload = {
      usuarioId:    usuario.usuarioId,
      dni:          usuario.dni,
      nombre:       usuario.nombre,
      rol:          usuario.rol,
      referenciaId: usuario.referenciaId,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    return res.status(200).json({
      token,
      usuario: payload,
    });

  } catch (error) {
    console.error("Error en login:", error);
    return res.status(500).json({ message: "Error interno del servidor." });
  }
};

/**
 * GET /api/auth/me
 * Requiere: jwtAuth middleware
 *
 * Devuelve los datos del usuario logueado (útil para refrescar el contexto).
 */
exports.me = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.usuario.usuarioId, {
      attributes: ["usuarioId", "dni", "nombre", "rol", "referenciaId"],
    });

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    return res.status(200).json(usuario);
  } catch (error) {
    return res.status(500).json({ message: "Error interno del servidor." });
  }
};

/**
 * POST /api/auth/seed
 * Crea usuarios de prueba para desarrollo.
 * ELIMINAR o proteger en producción.
 *
 * Crea:
 *  - 1 administrador (dni: 00000001, pass: admin123)
 *  - 1 docente       (dni: 00000002, pass: docente123)
 *  - 1 alumno        (dni: 11111111, pass: alumno123)
 */
exports.seedUsuarios = async (req, res) => {
  try {
    const SALT = 10;

    const usuarios = [
      {
        dni:          "00000001",
        nombre:       "Administrador Sistema",
        password:     await bcrypt.hash("admin123", SALT),
        rol:          "administrador",
        referenciaId: null,
      },
      {
        dni:          "00000002",
        nombre:       "Docente Prueba",
        password:     await bcrypt.hash("docente123", SALT),
        rol:          "docente",
        referenciaId: "00000002", // DNI del Profesor en tabla profesores
      },
      {
        dni:          "11111111",
        nombre:       "Adriana Amarilla",
        password:     await bcrypt.hash("alumno123", SALT),
        rol:          "alumno",
        referenciaId: "11111111", // DNI del Estudiante en tabla estudiantes
      },
    ];

    const creados = [];
    for (const u of usuarios) {
      const [usuario, created] = await Usuario.findOrCreate({
        where: { dni: u.dni },
        defaults: u,
      });
      if (created) creados.push(u.dni);
    }

    return res.status(200).json({
      message: `Seed completado. Usuarios creados: ${creados.length || "ninguno nuevo"}.`,
      creados,
      credenciales: [
        { rol: "administrador", dni: "00000001", password: "admin123" },
        { rol: "docente",       dni: "00000002", password: "docente123" },
        { rol: "alumno",        dni: "11111111", password: "alumno123" },
      ],
    });

  } catch (error) {
    console.error("Error en seed:", error);
    return res.status(500).json({ message: error.message });
  }
};
