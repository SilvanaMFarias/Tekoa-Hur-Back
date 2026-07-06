// services/reporteService.js
const { Op } = require("sequelize");
const { Asistencia, Comision, Materia, Usuario, Horario, Matricula, Feriado, Profesor } = require("../models");
const guaraniService = require("../services/guaraniService");
const { Parser } = require("json2csv");
const { Readable } = require("stream");

// Manejador de errores personalizado
const AppError = require("../errors/AppError");

// Constante de negocio idéntica al Frontend
const PERIODO_TEKOA = 256;

class ReporteService {
  formatearFechaAString(fechaInput) {
    if (!fechaInput) return "";
    if (typeof fechaInput === "string") {
      return fechaInput.split(" ")[0].split("T")[0].trim();
    }
    const d = new Date(fechaInput);
    if (isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Resuelve las comisiones según el rol
  async obtenerComisionIdsPorRol(dni, comisionId, esDocente) {
    if (esDocente) {
      const perfilProfesor = await Profesor.findOne({ where: { dni } });
      if (!perfilProfesor) {
        throw AppError.notFound("No se encontró el perfil docente para el identificador provisto.", "TEACHER_NOT_FOUND");
      }

      const filtroComision = { profesorId: perfilProfesor.profesorId };
      if (comisionId) filtroComision.comisionId = comisionId;

      const comisiones = await Comision.findAll({ where: filtroComision, attributes: ["comisionId"] });
      const ids = comisiones.map(comision => comision.comisionId);

      if (comisionId && ids.length === 0) {
        throw AppError.badRequest("El docente no se encuentra asignado a la comisión seleccionada.", "NOT_ASSIGNED_TO_COMMISSION");
      }
      return ids;
    } else {
      const filtroMatricula = { estudianteDni: dni };
      if (comisionId) filtroMatricula.comisionId = comisionId;

      const matriculas = await Matricula.findAll({ where: filtroMatricula, attributes: ["comisionId"] });
      const ids = matriculas.map(m => m.comisionId);

      if (comisionId && ids.length === 0) {
        throw AppError.badRequest("El estudiante no se encuentra matriculado en la comisión seleccionada.", "NOT_ENROLLED_IN_COMMISSION");
      }
      return ids;
    }
  }

  async generarReporteAsistencias({ usuarioId, comisionId, fechaInicio, fechaFin, format, rol }) {
    if (!usuarioId) {
      throw AppError.badRequest("El identificador de usuario es requerido.", "MISSING_USER_ID");
    }

    if (format && format !== "pdf" && format !== "csv") {
      throw AppError.badRequest("El formato de reporte solicitado no es válido. Use 'pdf' o 'csv'.", "INVALID_FORMAT");
    }

    const dniLimpio = String(usuarioId).trim();

    if (comisionId) {
      const existeComision = await Comision.findOne({ where: { comisionId } });
      if (!existeComision) {
        throw AppError.notFound(`La comisión con ID ${comisionId} no existe en el sistema.`, "COMMISSION_NOT_FOUND");
      }
    }

    const esDocente = String(rol).toLowerCase() === "docente";
    
    // Llamada al método factorizado
    const listaComisionIds = await this.obtenerComisionIdsPorRol(dniLimpio, comisionId, esDocente);

    // Si no tiene registros en absoluto (filtrado general), retorna reporte vacío
    if (listaComisionIds.length === 0) {
      const usuarioLogueado = await Usuario.findOne({ where: { dni: dniLimpio } });
      return await this.generarPDFVacio(usuarioLogueado ? usuarioLogueado.nombre : dniLimpio, format, esDocente);
    }

    // Consultar Períodos Lectivos desde Guaraní
    let fechaInicioDictado = "2026-03-01"; 
    let fechaFinDictado = this.formatearFechaAString(new Date());

    try {
      const periodos = await guaraniService.getPeriodosTekoa();
      if (Array.isArray(periodos)) {
        const periodoTarget = periodos.find(p => String(p.periodo) === String(PERIODO_TEKOA));
        if (periodoTarget) {
          if (periodoTarget.fecha_inicio_dictado) fechaInicioDictado = this.formatearFechaAString(periodoTarget.fecha_inicio_dictado); // se hace porq al consultar guarani esta la posibilidad de que no venga con el format completo
          if (periodoTarget.fecha_fin_dictado) fechaFinDictado = this.formatearFechaAString(periodoTarget.fecha_fin_dictado);//tambien para garantizar que las Llaves del Map coincidan exactament
        }                                                                                                                    //
      }
    } catch (error) {
      console.error("Error consultando períodos de Guaraní en reporte:", error);
    }

    // Traer asistencias reales mapeadas dinámicamente
    const whereAsistencias = {
      usuarioId: dniLimpio,
      comisionId: { [Op.in]: listaComisionIds },
      tipoUsuario: esDocente ? "PROFESOR" : "ESTUDIANTE"
    };
    
    whereAsistencias.fecha = { [Op.between]: [fechaInicio || fechaInicioDictado, fechaFin || fechaFinDictado] };

    const asistenciasBD = await Asistencia.findAll({ where: whereAsistencias });

    const mapaAsistenciasReales = new Map();
    asistenciasBD.forEach(asist => {
      const fechaClave = this.formatearFechaAString(asist.fecha);
      if (fechaClave) {
        mapaAsistenciasReales.set(`${fechaClave}_${asist.comisionId}`, String(asist.estado).toUpperCase().trim());
      }
    });

    // 4. Traer Feriados
    const feriadosBD = await Feriado.findAll({ attributes: ["fecha"] });
    const mapaFeriados = new Map();
    feriadosBD.forEach(f => {
      const fechaStr = this.formatearFechaAString(f.fecha);
      if (fechaStr) mapaFeriados.set(fechaStr, "Día no laborable");
    });

    // 5. Buscar horarios y comisiones
    const infoComisiones = await Comision.findAll({
      where: { comisionId: { [Op.in]: listaComisionIds } },
      include: [{ model: Horario, as: "horarios" }, { model: Materia, as: "materia" }]
    });

    const usuarioLogueado = await Usuario.findOne({ where: { dni: dniLimpio } });
    const nombreRealPersona = usuarioLogueado ? usuarioLogueado.nombre : `DNI: ${usuarioId}`;

    // 6. Delimitar los límites de la iteración
    const hoyStr = this.formatearFechaAString(new Date());
    const limiteSuperiorCalculado = hoyStr < fechaFinDictado ? hoyStr : fechaFinDictado;

    const fechaIteracion = new Date((fechaInicio || fechaInicioDictado) + "T12:00:00");
    const fechaLimite = new Date((fechaFin || limiteSuperiorCalculado) + "T12:00:00");

    const diasSemanaMap = { 0: "domingo", 1: "lunes", 2: "martes", 3: "miercoles", 4: "jueves", 5: "viernes", 6: "sabado" };
    const datosFinalesReporte = [];

    // 7. Bucle de matching estructurado unificado
    while (fechaIteracion <= fechaLimite) {
      const nombreDiaActual = diasSemanaMap[fechaIteracion.getDay()];
      const fechaClaseStr = this.formatearFechaAString(fechaIteracion);
      const tipoEventoExcepcional = mapaFeriados.get(fechaClaseStr);

      infoComisiones.forEach(comision => {
        if (!comision.horarios) return;

        const tieneClaseEseDia = comision.horarios.some(h => {
          const diaHorarioDB = String(h.diaSemana).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const diaCalendarioActual = nombreDiaActual.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return diaHorarioDB === diaCalendarioActual;
        });

        if (tieneClaseEseDia) {
          let estadoFinalReporte = "Ausente";

          if (tipoEventoExcepcional) {
            estadoFinalReporte = tipoEventoExcepcional; 
          } else {
            const claveCruze = `${fechaClaseStr}_${comision.comisionId}`;
            const estadoBD = mapaAsistenciasReales.get(claveCruze);

            if (estadoBD) {
              if (estadoBD === "PRESENTE") estadoFinalReporte = "Presente";
              else if (estadoBD === "TARDE") estadoFinalReporte = "Tarde";
              else if (estadoBD.startsWith("JUSTIFICA")) estadoFinalReporte = "Justificado";
              else if (estadoBD === "AUSENTE") estadoFinalReporte = "Ausente";
            }
          }

          //Dinamismo de claves usando corchetes computados
          datosFinalesReporte.push({
            Fecha: fechaClaseStr,
            [esDocente ? "Docente" : "Alumno"]: nombreRealPersona, // Clave dinámica
            Comision: comision.cod_comision || "S/D",
            Materia: comision.materia?.nombre || "S/D",
            Estado: estadoFinalReporte
          });
        }
      });

      fechaIteracion.setDate(fechaIteracion.getDate() + 1);
    }

    if (datosFinalesReporte.length === 0) {
      return await this.generarPDFVacio(nombreRealPersona, format, esDocente);
    }

    datosFinalesReporte.sort((a, b) => new Date(a.Fecha + "T12:00:00") - new Date(b.Fecha + "T12:00:00"));

    const timestamp = Date.now();
    if (format === "csv") {
      return this.generarCSV(datosFinalesReporte, `mis_asistencias_${timestamp}.csv`);
    } else if (format === "pdf") {
      return await this.generarPDFConPuppeteer(datosFinalesReporte, `mis_asistencias_${timestamp}.pdf`, esDocente);
    }
  }

  // Métodos de renderizado visual (PDF, CSV, Puppeteer)
  async generarPDFVacio(nombrePersona, format, esDocente = false) {
    const timestamp = Date.now();
    const rolEtiqueta = esDocente ? "Docente" : "Alumno";

    if (format === "csv") {
      const json2csvParser = new Parser({ fields: ["Aviso"] });
      const csv = json2csvParser.parse([{ Aviso: `No hay registros en el rango para el ${rolEtiqueta.toLowerCase()} ${nombrePersona}` }]);
      return { stream: Readable.from([csv]), mimeType: "text/csv", fileName: `sin_asistencias_${timestamp}.csv` };
    }
    let browser;
    try {
      const puppeteerModule = await import("puppeteer");
      browser = await puppeteerModule.default.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
      const page = await browser.newPage();
      const htmlContent = `<html><body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; color: #4B5563;"><h1 style="color: #1B5E20;">TEKOÁ-HUR</h1><h2>Reporte de Asistencias Personal</h2><p><strong>${rolEtiqueta}:</strong> ${nombrePersona}</p><hr><p style="font-style: italic;">No se encontraron días de clase asignados en el rango.</p></body></html>`;
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
      return { stream: Readable.from([pdfBuffer]), mimeType: "application/pdf", fileName: `sin_asistencias_${timestamp}.pdf` };
    } finally { if (browser) await browser.close(); }
  }

  generarCSV(datos, fileName) {
    const json2csvParser = new Parser({ delimiter: ";" });
    const csv = json2csvParser.parse(datos);
    return { stream: Readable.from([csv]), mimeType: "text/csv", fileName };
  }

  async generarPDFConPuppeteer(datos, fileName, esDocente = false) {
    let browser;
    const rolEtiqueta = esDocente ? "Docente" : "Alumno";
    try {
      const puppeteerModule = await import("puppeteer");
      browser = await puppeteerModule.default.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
      const page = await browser.newPage();
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Mis Asistencias</title>
          <style>
            :root {
              --color-primary: #1B5E20; --color-primary-light: #E8F5E9;
              --color-success: #16A34A; --color-success-bg: #DCFCE7;
              --color-error: #DC2626; --color-error-bg: #FEE2E2;
              --color-warning: #D97706; --color-warning-bg: #FEF3C7;
              --color-neutral: #4B5563; --color-neutral-bg: #F3F4F6;
              --color-text-primary: #111827; --color-text-secondary: #4B5563;
              --color-border: #D1D5DB; --color-surface-alt: #F9FAFB;
            }
            @page { size: A4; margin: 20mm 15mm; }
            body { font-family: Arial, sans-serif; color: var(--color-text-primary); margin: 0; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--color-primary); padding-bottom: 12px; margin-bottom: 24px; }
            .header h1 { font-size: 24px; color: var(--color-primary); margin: 0; }
            table { width: 100%; border-collapse: collapse; }
            th { background-color: var(--color-primary-light); color: var(--color-primary); padding: 12px; border-bottom: 1px solid var(--color-border); text-align: left; }
            td { padding: 12px; border-bottom: 1px solid var(--color-border); }
            tr:nth-child(even) { background-color: var(--color-surface-alt); }
            .subtext { font-size: 11px; color: var(--color-text-secondary); font-style: italic; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-align: center; width: 120px; }
            .badge-presente { background-color: var(--color-success-bg); color: var(--color-success); }
            .badge-tarde { background-color: var(--color-warning-bg); color: var(--color-warning); }
            .badge-ausente { background-color: var(--color-error-bg); color: var(--color-error); }
            .badge-excepcional { background-color: var(--color-neutral-bg); color: var(--color-neutral); }
          </style>
        </head>
        <body>
          <div class="header">
            <div><h1>TEKOÁ-HUR</h1><p>Reporte de Asistencias Personal</p></div>
            <div><p><strong>Fecha de Emisión:</strong> ${new Date().toLocaleDateString('es-AR')}</p></div>
          </div>
          <table>
            <thead>
              <tr><th>Fecha</th><th>${rolEtiqueta}</th><th>Materia / Comisión</th><th style="text-align: center;">Estado</th></tr>
            </thead>
            <tbody>
              ${datos.map(d => {
                const esEstadoComun = ['Presente', 'Tarde', 'Ausente', 'Justificado'].includes(d.Estado);
                const claseBadge = esEstadoComun 
                  ? (d.Estado === 'Presente' ? 'badge-presente' : d.Estado === 'Tarde' ? 'badge-tarde' : 'badge-ausente')
                  : 'badge-excepcional';
                
                const nombrePersona = esDocente ? d.Docente : d.Alumno;

                return `
                <tr>
                  <td>${d.Fecha}</td>
                  <td><strong>${nombrePersona}</strong></td>
                  <td><div><strong>${d.Materia}</strong></div><div class="subtext">${d.Comision}</div></td>
                  <td style="text-align: center;">
                    <span class="badge ${claseBadge}">${d.Estado}</span>
                  </td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
      return { stream: Readable.from([pdfBuffer]), mimeType: "application/pdf", fileName };
    } finally { if (browser) await browser.close(); }
  }
}

module.exports = new ReporteService();