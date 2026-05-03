const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const { Usuario, Estudiante, Profesor } = require("../models");

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// ============================================================
// 🔐 LOGIN
// ============================================================

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Faltan credenciales" });
    }

    const user = await Usuario.findOne({
      where: { email },
      include: [
        { model: Estudiante, as: "estudiante" },
        { model: Profesor, as: "profesor" },
      ],
    });

    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      {
        id: user.usuarioId,
        email: user.email,
        rol: user.rol,
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({
      token,
      user: {
        id: user.usuarioId,
        email: user.email,
        rol: user.rol,
        estudiante: user.estudiante,
        profesor: user.profesor,
      },
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Error en login" });
  }
};

// ============================================================
// 🔐 ME
// ============================================================

const me = async (req, res) => {
  try {
    const auth = req.headers.authorization;

    if (!auth) {
      return res.status(401).json({ message: "No autorizado" });
    }

    const token = auth.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Token inválido" });
    }

    const user = await Usuario.findByPk(decoded.id, {
      include: [
        { model: Estudiante, as: "estudiante" },
        { model: Profesor, as: "profesor" },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    return res.json({
      id: user.usuarioId,
      email: user.email,
      rol: user.rol,
      estudiante: user.estudiante,
      profesor: user.profesor,
    });

  } catch (error) {
    console.error("ME error:", error);
    return res.status(500).json({ message: "Error obteniendo usuario" });
  }
};

module.exports = {
  login,
  me,
};