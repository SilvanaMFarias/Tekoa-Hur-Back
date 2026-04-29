// ============================================================
// routes/qr.js
// ============================================================
// FIXES:
//  ✅ /generar ahora guarda rtokenExpira (antes el token duraba para siempre)
//  ✅ /validar ahora verifica que el token no expiró
//  ✅ NUEVO endpoint POST /registrar — el eslabón que faltaba:
//     recibe el escaneo, valida el QR, detecta la comisión por
//     horario activo, valida pertenencia y crea la asistencia.
// ============================================================

const express = require("express");
const router  = express.Router();
const crypto  = require("crypto");
const { Op }  = require("sequelize");
const { Aula, Asistencia, Horario, Comision, Matricula, Profesor } = require("../models");

// Días en español sin tilde para coincidir con importarController
function nombreDia(date) {
  return ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"][date.getDay()];
}

// ── POST /api/qr/generar ─────────────────────────────────────
// El docente genera el QR para el aula.
// Guarda el token y su fecha de expiración en la tabla aulas.
router.post("/generar", async (req, res) => {
  try {
    const { aulaId } = req.body;
    if (!aulaId) return res.status(400).json({ message: "aulaId es requerido" });

    const aula = await Aula.findByPk(aulaId);
    if (!aula) return res.status(404).json({ message: "Aula no encontrada" });

    const rtoken = crypto.randomBytes(16).toString("hex");

    // Duración configurable en .env (default 120 min = 2 horas)
    const minutos      = parseInt(process.env.DURACION_QR_MINUTOS || "120", 10);
    const rtokenExpira = new Date(Date.now() + minutos * 60 * 1000);

    aula.rtoken       = rtoken;
    aula.rtokenExpira = rtokenExpira;
    await aula.save();

    return res.status(200).json({ message: "QR generado", rtoken, expiraEn: rtokenExpira });

  } catch (error) {
    console.error("Error generar QR:", error);
    return res.status(500).json({ message: "Error interno" });
  }
});

// ── GET /api/qr/validar ──────────────────────────────────────
// El front llama esto al cargar la página de registro.
// Verifica que el token sea válido y no haya expirado.
router.get("/validar", async (req, res) => {
  try {
    const { edificioId, aulaId, rtoken } = req.query;

    const aula = await Aula.findOne({ where: { aulaId, edificioId } });

    if (!aula || !aula.rtoken || aula.rtoken !== rtoken) {
      return res.status(403).json({ ok: false, message: "QR inválido o expirado" });
    }

    // ✅ Verificar expiración
    if (aula.rtokenExpira && new Date() > new Date(aula.rtokenExpira)) {
      await aula.update({ rtoken: null, rtokenExpira: null });
      return res.status(403).json({ ok: false, message: "El QR expiró" });
    }

    return res.status(200).json({ ok: true, message: "QR válido" });

  } catch (error) {
    console.error("Error validar QR:", error);
    return res.status(500).json({ message: "Error interno" });
  }
});

// ── POST /api/qr/registrar ───────────────────────────────────
// ✅ ENDPOINT NUEVO — completa el flujo end-to-end
// Body: { tipoUsuario, usuarioId, aulaId, rtoken, fechaInicio?, fechaFin? }
//
// FLUJO:
//  1. Valida el rtoken contra la DB
//  2. Verifica que no expiró
//  3. Verifica ventana de fechaInicio/fechaFin (si viene)
//  4. Busca el horario activo ahora en esa aula → determina comisionId
//  5. Valida que el usuario pertenece a esa comisión
//  6. Evita doble registro en el mismo día
//  7. Crea la asistencia
router.post("/registrar", async (req, res) => {
  try {
    const { tipoUsuario, usuarioId, aulaId, rtoken, fechaInicio, fechaFin } = req.body;

    if (!tipoUsuario || !usuarioId || !aulaId || !rtoken) {
      return res.status(400).json({ message: "Faltan campos: tipoUsuario, usuarioId, aulaId, rtoken" });
    }

    // 1. Validar QR
    const aula = await Aula.findByPk(aulaId);
    if (!aula || !aula.rtoken || aula.rtoken !== rtoken) {
      return res.status(403).json({ message: "QR inválido o expirado" });
    }

    // 2. Verificar expiración
    if (aula.rtokenExpira && new Date() > new Date(aula.rtokenExpira)) {
      await aula.update({ rtoken: null, rtokenExpira: null });
      return res.status(403).json({ message: "El QR expiró" });
    }

    // 3. Fecha y hora actuales
    const now          = new Date();
    const fecha        = now.toISOString().split("T")[0]; // "YYYY-MM-DD"
    const horaRegistro = now.toTimeString().slice(0, 5);  // "HH:MM"

    // 4. Validar ventana de tiempo opcional
    if (fechaInicio && fechaFin) {
      if (now < new Date(fechaInicio) || now > new Date(fechaFin)) {
        return res.status(403).json({ message: "QR fuera de su ventana de tiempo" });
      }
    }

    // 5. Buscar horario activo → determina la comisión automáticamente
    const horario = await Horario.findOne({
      where: {
        aulaId,
        diaSemana: nombreDia(now),
        horaDesde: { [Op.lte]: horaRegistro },
        horaHasta: { [Op.gte]: horaRegistro },
      },
      include: [{
        model: Comision,
        as: "comision",
        include: [{ model: Profesor, as: "profesor" }],
      }],
    });

    if (!horario) {
      return res.status(400).json({
        message: `No hay clase activa en esta aula ahora (${nombreDia(now)} ${horaRegistro})`,
      });
    }

    const comisionId = horario.comisionId;

    // 6. Validar pertenencia
    const tipo = tipoUsuario.toUpperCase();
    if (tipo === "ESTUDIANTE") {
      const matricula = await Matricula.findOne({
        where: { estudianteDni: String(usuarioId).trim(), comisionId },
      });
      if (!matricula) {
        return res.status(403).json({ message: "No estás matriculado en esta comisión" });
      }
    } else if (tipo === "PROFESOR") {
      const profe = horario.comision?.profesor;
      if (profe && profe.dni !== String(usuarioId).trim()) {
        return res.status(403).json({ message: "No sos el docente titular de esta comisión" });
      }
    } else {
      return res.status(400).json({ message: 'tipoUsuario debe ser "ESTUDIANTE" o "PROFESOR"' });
    }

    // 7. Evitar doble registro
    const yaExiste = await Asistencia.findOne({
      where: { usuarioId: String(usuarioId).trim(), comisionId, fecha },
    });
    if (yaExiste) {
      return res.status(409).json({ message: "Ya registraste tu asistencia hoy" });
    }

    // 8. Crear asistencia
    const nueva = await Asistencia.create({
      usuarioId:    String(usuarioId).trim(),
      tipoUsuario:  tipo,
      comisionId,
      fecha,
      horaRegistro,
      estado: "PRESENTE",
    });

    return res.status(201).json({ message: "✅ Asistencia registrada", data: nueva });

  } catch (error) {
    console.error("Error registrar QR:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

module.exports = router;