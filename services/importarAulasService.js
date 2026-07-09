// ============================================================
// services/importarAulasService.js
// ============================================================
// Procesa un archivo Excel con la hoja "AULAS" y hace upsert
// (crear o actualizar) de edificios, aulas y sus atributos.
//
// Reglas de negocio:
//   1. Solo procesa la hoja llamada "AULAS" (ignora las demás).
//   2. Es IDEMPOTENTE: subir el mismo archivo dos veces no duplica.
//   3. Forward-fill del edificio (completar celdas vacías).
//   4. Parser FLEXIBLE del nombre del aula:
//      - "AULA JS-005"           → sector=JS, numero=005
//      - "AULA TALLER JS-005"    → sector=JS, numero=005 (con "AULA TALLER" como tipoAula)
//      - "LAB JS-010"            → sector=JS, numero=010 (con "LAB" como tipoAula)
//      - "AULA MA- 003"          → sector=MA, numero=003 (acepta espacio en el código)
//      - "AULA OB 13"            → sector=OB, numero=13  (acepta espacio en vez de guion)
//      - "BIBLIOTECA"            → sector=BIBLIOTECA, numero=UNICO
//   5. IGNORA silenciosamente notas del Excel: "BAÑOS",
//      "Cuestiones generales", "Cuestiones generales", etc.
//   6. El nombre del edificio se LIMPIA quitando el prefijo "AULAS".
//   7. Errores por fila NO frenan el proceso.
// ============================================================

const XLSX = require("xlsx");
const {
  sequelize,
  Edificio,
  Aula,
  AulaAtributos,
} = require("../models");

// ────────────────────────────────────────────────────────────
// LISTA NEGRA: nombres que NO son aulas reales sino notas
// del Excel. Se comparan en minúsculas y sin acentos.
// ────────────────────────────────────────────────────────────
const IGNORAR_EXACTOS = new Set([
  "banos",
  "cuestiones generales",
  "hall central",
  "banos pasillo",
  "banos hall ssc",
  "banos buffet",
  "banos planta alta",
  "hall ob",
  "patio de los murales",
]);

// Prefijos/palabras que indican que la fila es una nota, no un aula
const IGNORAR_PREFIJOS = ["banos"];

class ImportarAulasService {
  // ============================================================
  // MÉTODO PRINCIPAL
  // ============================================================
  async procesar(buffer) {
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const ws = workbook.Sheets["AULAS"];
    if (!ws) {
      throw new Error("El archivo no contiene la hoja 'AULAS'");
    }

    const filas = XLSX.utils.sheet_to_json(ws, { defval: null });

    const resultado = {
      creadas: 0,
      actualizadas: 0,
      ignoradas: 0,
      errores: [],
    };

    let ultimoEdificio = null;

    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i];
      const numeroFila = i + 2;

      try {
        // ── Forward-fill del edificio ──
        if (fila["Edificio"] && String(fila["Edificio"]).trim()) {
          // ⭐ LIMPIAR el prefijo "AULAS " si existe
          ultimoEdificio = this._limpiarNombreEdificio(
            String(fila["Edificio"]).trim()
          );
        }

        if (!ultimoEdificio) {
          resultado.errores.push({
            fila: numeroFila,
            motivo: "No hay edificio (ni en esta fila ni en filas anteriores)",
          });
          continue;
        }

        // ── Nombre del aula ──
        const nombreAula = fila["Aula"] && String(fila["Aula"]).trim();
        if (!nombreAula) {
          // Filas sin aula (líneas de totales, separadores) se saltan
          continue;
        }

        // ⭐ ¿Es una nota del Excel? Ignorar silenciosamente
        if (this._debeIgnorar(nombreAula)) {
          resultado.ignoradas++;
          continue;
        }

        // ── Parsear el nombre del aula ──
        const parsed = this._parsearNombreAula(nombreAula);
        if (!parsed) {
          resultado.errores.push({
            fila: numeroFila,
            motivo: `Nombre de aula con formato inválido: "${nombreAula}"`,
          });
          continue;
        }

        // ── Procesar la fila ──
        const resFila = await this._procesarFila({
          nombreEdificio: ultimoEdificio,
          sector: parsed.sector,
          numero: parsed.numero,
          tipoAulaDelNombre: parsed.tipoAulaDelNombre, // "AULA TALLER", "LAB", null
          datosExcel: fila,
        });

        if (resFila.creada) {
          resultado.creadas++;
        } else {
          resultado.actualizadas++;
        }
      } catch (err) {
        resultado.errores.push({
          fila: numeroFila,
          motivo: err.message || "Error desconocido",
        });
      }
    }

    return resultado;
  }

  // ============================================================
  // LIMPIAR nombre del edificio
  // ============================================================
  /**
   * "AULAS JUSTICIA SOCIAL"    → "JUSTICIA SOCIAL"
   * "AULA JUSTICIA SOCIAL"     → "JUSTICIA SOCIAL"
   * "JUSTICIA SOCIAL"          → "JUSTICIA SOCIAL"
   *
   * El regex /^AULAS?\s+/i:
   *   ^        → desde el inicio
   *   AULA     → literal "AULA"
   *   S?       → S opcional (para aceptar "AULA" o "AULAS")
   *   \s+      → uno o más espacios
   *   /i       → case insensitive
   */
  _limpiarNombreEdificio(nombre) {
    return nombre.replace(/^AULAS?\s+/i, "").trim();
  }

  // ============================================================
  // DECIDIR si una fila hay que ignorar (notas del Excel)
  // ============================================================
  _debeIgnorar(nombre) {
    // Normalizar: minúsculas y sin acentos
    const norm = nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    // ¿Coincide exactamente con alguno de la blacklist?
    if (IGNORAR_EXACTOS.has(norm)) return true;

    // ¿Empieza con alguno de los prefijos a ignorar?
    for (const prefijo of IGNORAR_PREFIJOS) {
      if (norm.startsWith(prefijo)) return true;
    }

    return false;
  }

  // ============================================================
  // PARSER FLEXIBLE del nombre del aula
  // ============================================================
  /**
   * Estrategia:
   *   1. Intentar encontrar un código tipo "XX-###" o "XX ###"
   *      en cualquier parte del texto.
   *   2. Si aparece, extraer sector + numero.
   *      Lo que hay ANTES del código se guarda como tipoAulaDelNombre
   *      (ej: "AULA TALLER", "LAB", "LABORATORIO ALIMENTOS").
   *   3. Si no aparece código, usar el nombre completo como sector
   *      y "UNICO" como número (ej: "BIBLIOTECA").
   *
   * @returns { sector, numero, tipoAulaDelNombre } o null si es
   *          un nombre demasiado corto para ser válido.
   */
  _parsearNombreAula(nombre) {
    const limpio = nombre.trim();
    if (limpio.length < 2) return null;

    // ── Intento 1: buscar código "XX-###" o "XX ###" ──
    // Regex:
    //   ([A-Z]{1,4})   → sector: 1 a 4 letras
    //   [-\s]+         → uno o más guiones/espacios
    //   (\d{1,4}[A-Z]?)→ número: 1 a 4 dígitos, con letra opcional al final
    //   /i             → case insensitive
    //
    // Ejemplos que matchea:
    //   "AULA JS-005"          → JS-005
    //   "AULA TALLER JS-005"   → JS-005
    //   "LAB JS-010"           → JS-010
    //   "AULA MA- 003"         → MA-003 (espacio después del guion, ok)
    //   "AULA OB 13"           → OB-13  (espacio en vez de guion, ok)
    const matchCodigo = limpio.match(/([A-Z]{1,4})[-\s]+(\d{1,4}[A-Z]?)/i);

    if (matchCodigo) {
      const sector = matchCodigo[1].toUpperCase();
      const numero = matchCodigo[2].toUpperCase();

      // Lo que hay ANTES del código: lo guardamos como tipoAulaDelNombre
      // Ejemplo: "AULA TALLER JS-005" → prefijo "AULA TALLER"
      //          "LAB JS-010"         → prefijo "LAB"
      //          "AULA JS-005"        → prefijo "AULA" (lo dejamos null)
      const indiceMatch = matchCodigo.index;
      const prefijoBruto = limpio.substring(0, indiceMatch).trim();

      // Si el prefijo es solo "AULA" o vacío, no lo guardamos como tipo
      // (es el caso "normal" y no aporta info)
      let tipoAulaDelNombre = null;
      if (prefijoBruto && prefijoBruto.toUpperCase() !== "AULA") {
        tipoAulaDelNombre = prefijoBruto;
      }

      return { sector, numero, tipoAulaDelNombre };
    }

    // ── Intento 2: es un aula "única" tipo BIBLIOTECA, GIMNASIO ──
    // No tiene código → usar el nombre completo como sector, "UNICO" como número.
    // Normalizamos: mayúsculas, sin espacios múltiples, sin puntos.
    const sectorUnico = limpio
      .toUpperCase()
      .replace(/\s+/g, "_")   // "GIMNASIO planta alta" → "GIMNASIO_PLANTA_ALTA"
      .replace(/[^A-Z0-9_]/g, "");

    if (!sectorUnico) return null;

    return {
      sector: sectorUnico,
      numero: "UNICO",
      tipoAulaDelNombre: null,
    };
  }

  // ============================================================
  // PROCESAR una fila (upsert de edificio, aula, atributos)
  // ============================================================
  async _procesarFila({
    nombreEdificio,
    sector,
    numero,
    tipoAulaDelNombre,
    datosExcel,
  }) {
    return await sequelize.transaction(async (t) => {
      // 1. Upsert del edificio
      const [edificio] = await Edificio.findOrCreate({
        where: { nombre: nombreEdificio },
        defaults: { nombre: nombreEdificio },
        transaction: t,
      });

      // 2. Buscar el aula
      let aula = await Aula.findOne({
        where: { sector, numero, edificioId: edificio.edificioId },
        transaction: t,
      });

      let creada = false;
      if (!aula) {
        aula = await Aula.create(
          { sector, numero, edificioId: edificio.edificioId },
          { transaction: t }
        );
        creada = true;
      }

      // 3. Extraer atributos del Excel
      //    Si el parser detectó tipo en el nombre (ej "LAB", "AULA TALLER"),
      //    lo pasamos para que tenga prioridad sobre lo que dice la columna
      //    "Descripción/ Tipo de Mobiliario".
      const atributos = this._extraerAtributos(datosExcel, tipoAulaDelNombre);

      // 4. Upsert de atributos (relación 1:1)
      const [atrib, atribCreada] = await AulaAtributos.findOrCreate({
        where: { aulaId: aula.aulaId },
        defaults: { aulaId: aula.aulaId, ...atributos },
        transaction: t,
      });

      if (!atribCreada) {
        await atrib.update(atributos, { transaction: t });
      }

      return { creada };
    });
  }

  // ============================================================
  // EXTRAER atributos
  // ============================================================
  _extraerAtributos(fila, tipoAulaDelNombre) {
    const capacidad = this._toInt(fila["Capacidad (Personas)"]);

    // ⭐ tipoAula: si viene del nombre (ej "LAB", "AULA TALLER") tiene
    // prioridad. Sino, usamos la columna "Descripción/ Tipo de Mobiliario".
    const tipoAula =
      tipoAulaDelNombre ||
      this._toStringOrNull(fila["Descripción/ Tipo de Mobiliario"]);

    const descripcion = this._buscarPorPrefijo(fila, "OBSERVACIONES");

    const equipamiento = [];

    this._agregarCantidad(equipamiento, fila["PUPITRES"], "pupitres");
    this._agregarCantidad(equipamiento, fila["SILLAS"], "sillas");
    this._agregarCantidad(equipamiento, fila["MESAS DE ESTUDIO"], "mesas de estudio");
    this._agregarCantidad(equipamiento, fila["MESA DE DOCENTE"], "mesa de docente");
    this._agregarCantidad(equipamiento, fila["MESAS DOCENTE"], "mesas de docente");
    this._agregarCantidad(equipamiento, fila["MESAS ACC."], "mesas accesibles");
    this._agregarCantidad(equipamiento, fila["BANQUETAS"], "banquetas");
    this._agregarCantidad(equipamiento, fila["SILLAS.1"], "sillas adicionales");

    this._agregarSiNo(equipamiento, fila["TV"], "TV");
    this._agregarSiNo(equipamiento, fila["PC"], "PC");
    this._agregarSiNo(equipamiento, fila["Internet"], "internet");
    this._agregarSiNo(equipamiento, fila["Llaves"], "llaves");
    this._agregarSiNo(equipamiento, fila["A/A\ncalefacción"], "aire/calefacción");
    this._agregarSiNo(equipamiento, fila["pizarra"], "pizarra");

    // ⭐ Es laboratorio: detectamos si el tipo (del nombre o de la col)
    // contiene "LAB" o "LABORATORIO"
    const tipoUpper = (tipoAula || "").toUpperCase();
    const esLabPorNombre = tipoUpper.includes("LAB");
    const esLabPorPC = this._siONo(fila["PC"]);
    const esLab = esLabPorNombre || esLabPorPC;

    return {
      capacidad,
      tipoAula,
      esLaboratorioInformatico: esLab,
      cantidadPC: esLab ? this._toInt(fila["PC"]) : null,
      descripcion,
      equipamiento,
    };
  }

  // ============================================================
  // HELPERS de parseo
  // ============================================================

  _toInt(val) {
    if (val === null || val === undefined || val === "") return null;
    const n = parseInt(val, 10);
    return isNaN(n) ? null : n;
  }

  _toStringOrNull(val) {
    if (val === null || val === undefined) return null;
    const s = String(val).trim();
    return s.length ? s : null;
  }

  _buscarPorPrefijo(obj, prefijo) {
    const key = Object.keys(obj).find((k) => k.startsWith(prefijo));
    if (!key) return null;
    return this._toStringOrNull(obj[key]);
  }

  _agregarCantidad(arr, val, nombre) {
    if (val === null || val === undefined || val === "") return;
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0) {
      arr.push(`${n} ${nombre}`);
    } else if (this._siONo(val)) {
      arr.push(nombre);
    }
  }

  _agregarSiNo(arr, val, nombre) {
    if (this._siONo(val)) {
      arr.push(nombre);
    }
  }

  _siONo(val) {
    if (val === null || val === undefined) return false;
    const s = String(val).trim().toUpperCase();
    return s === "SI" || s === "SÍ" || s === "YES" || s === "TRUE" || s === "1";
  }
}

module.exports = new ImportarAulasService();
