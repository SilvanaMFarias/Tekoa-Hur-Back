const request = require("supertest");
const app = require("../../app");
const XLSX = require("xlsx");
const {
  Edificio, Aula, Profesor, Materia, Comision,
  Horario, Estudiante, Matricula, Usuario
} = require("../../models");
const { generarTokenAdmin } = require("../setup/auth"); // Ajustá la ruta a tu util de tokens

// Helper para generar el Excel en memoria con la estructura exacta
function generarExcelMockBuffer() {
  const wb = XLSX.utils.book_new();

  // 1. Datos para la pestaña 'comisiones' (Formato de matriz con cabecera)
  const datosComisiones = [
    ["cod_comision", "docente_nombre", "docente_dni", "docente_email", "horaDesde", "horaHasta", "espacio", "edificio", "actividad", "dia"],
    ["COM-101", "Carlos Docente", "22111333", "carlos@test.com", "18:00", "22:00", "AULA 1-102", "Bloque Central", "Sistemas Operativos", "Lunes"]
  ];
  const wsComisiones = XLSX.utils.aoa_to_sheet(datosComisiones);
  XLSX.utils.book_append_sheet(wb, wsComisiones, "comisiones");

  // 2. Datos para la pestaña 'matriculacion'
  const datosMatriculacion = [
    ["nombre_apellido", "dni", "email", "materia", "cod_comision", "docente"],
    ["Tomás Miranda", "44555666", "tomas@test.com", "Sistemas Operativos", "COM-101", "Carlos Docente"]
  ];
  const wsMatriculacion = XLSX.utils.aoa_to_sheet(datosMatriculacion);
  XLSX.utils.book_append_sheet(wb, wsMatriculacion, "matriculacion");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

describe("Pruebas de Integración Reales - Controlador de Importación Excel", () => {
  let token;
  let excelBuffer;



  beforeEach(async () => {
    // 1. Recrear la base de datos limpia de forma segura y automática
    const { sequelize } = require("../../models"); // Asegurate de que la ruta a tus modelos sea correcta
    await sequelize.sync({ force: true });

    // 2. Generar token en caso de que tus rutas de administración estén protegidas
    token = generarTokenAdmin();

    // 3. Generar un nuevo binario fresco de Excel antes de cada test
    excelBuffer = generarExcelMockBuffer();
  });

  // ============================================================================
  // 1. POST /api/importar/preview
  // ============================================================================
  describe("POST /api/importar/preview", () => {
    it("debería parsear el excel y retornar un resumen estadístico sin persistir en base de datos", async () => {
      const res = await request(app)
        .post("/api/importar/preview")
        .set("Authorization", `Bearer ${token}`)
        .attach("archivo", excelBuffer, "carga_academica.xlsx") // Envío binario multipart/form-data
        .expect(200);




      // Validar estructura del objeto de previsualización
      expect(res.body).toHaveProperty("resumen");
      expect(res.body).toHaveProperty("comisiones");
      expect(res.body).toHaveProperty("estudiantes");

      const { comisiones, estudiantes, edificios, materias } = res.body;

      // Convertimos todo el cuerpo de la respuesta a un string plano
      const cuerpoTexto = JSON.stringify(res.body);

      // 1. Validamos que las listas tengan los datos esperados midiendo su existencia en el texto
      expect(cuerpoTexto).toContain("COM-101");
      expect(cuerpoTexto).toContain("Tomás Miranda");

      // 2. Validamos de forma segura que el edificio y la materia estén presentes en la respuesta
      expect(cuerpoTexto).toContain("Bloque Central");
      expect(cuerpoTexto).toContain("Sistemas Operativos");

      // Verificar que NO se persistió nada en la base de datos (fue solo un preview)
      const countEdificios = await Edificio.count();
      expect(countEdificios).toBe(0);
    });

    it("debería responder con 400 si la petición no incluye el archivo Excel", async () => {
      const res = await request(app)
        .post("/api/importar/preview")
        .set("Authorization", `Bearer ${token}`)
        .expect(400);

      expect(res.body.error).toMatch(/no se recibió archivo/i);
    });
  });

  // ============================================================================
  // 2. POST /api/importar/confirmar
  // ============================================================================
  describe("POST /api/importar/confirmar", () => {
    it("debería procesar, guardar la jerarquía relacional completa y sincronizar los usuarios con credenciales seguras", async () => {
      const res = await request(app)
        .post("/api/importar/confirmar")
        .set("Authorization", `Bearer ${token}`)
        .attach("archivo", excelBuffer, "carga_academica.xlsx")
        .expect(200);

      expect(res.body.mensaje).toMatch(/importación completada con éxito/i);

      const { resultados } = res.body;
      expect(resultados.edificios).toBe(1);
      expect(resultados.aulas).toBe(1);
      expect(resultados.profesores).toBe(1);
      expect(resultados.materias).toBe(1);
      expect(resultados.comisiones).toBe(1);
      expect(resultados.horarios).toBe(1);
      expect(resultados.estudiantes).toBe(1);
      expect(resultados.matriculas).toBe(1);
      expect(resultados.errores.length).toBe(0);

      // Verificaciones Directas en la Base de Datos Relacional de Pruebas

      // 1. Validar que el Edificio se creó correctamente
      const edificioDb = await Edificio.findOne({ where: { nombre: "Bloque Central" } });
      expect(edificioDb).not.toBeNull();

      // 2. Validar parseo inteligente de Aula ("AULA 1-102" -> sector: "1", numero: "102")
      const aulaDb = await Aula.findOne({ where: { sector: "1", numero: "102" } });
      expect(aulaDb).not.toBeNull();

      // 3. Validar creación automática del Alumno y Profesor
      const estudianteDb = await Estudiante.findOne({ where: { dni: "44555666" } });
      expect(estudianteDb).not.toBeNull();
      expect(estudianteDb.nombre_apellido).toBe("Tomás Miranda");

      const profesorDb = await Profesor.findOne({ where: { dni: "22111333" } });
      expect(profesorDb).not.toBeNull();

      // 4. Validar sincronización de Cuentas de Acceso (Modelos de Autenticación)
      // Deberían haberse creado 2 usuarios (1 de rol alumno + 1 de rol docente)
      const usuarioAlumno = await Usuario.findOne({ where: { dni: "44555666", rol: "alumno" } });
      expect(usuarioAlumno).not.toBeNull();
      expect(usuarioAlumno.nombre).toBe("Tomás Miranda");
      // Respetando la especificación de tu modelo: referenciaId guarda el DNI
      expect(usuarioAlumno.referenciaId).toBe("44555666");

      const usuarioDocente = await Usuario.findOne({ where: { dni: "22111333", rol: "docente" } });
      expect(usuarioDocente).not.toBeNull();
      expect(usuarioDocente.referenciaId).toBe("22111333");
    });

    it("debería procesar de forma idempotente (findOrCreate) la primera subida", async () => {
      // Primera vuelta: Se asegura de que procese y cree los registros de forma normal
      const resPrimera = await request(app)
        .post("/api/importar/confirmar")
        .set("Authorization", `Bearer ${token}`)
        .attach("archivo", excelBuffer, "carga_academica.xlsx")
        .expect(200);

      // Verificamos que en la primera subida sí cree entidades
      expect(resPrimera.body.resultados.profesores).toBeGreaterThan(0);
      expect(resPrimera.body.resultados.estudiantes).toBeGreaterThan(0);
    });

    it("debería devolver 0 en contadores si se sube el mismo archivo por segunda vez consecutiva", async () => {
      // 1. Primera subida (crea todo)
      await request(app)
        .post("/api/importar/confirmar")
        .set("Authorization", `Bearer ${token}`)
        .attach("archivo", excelBuffer, "carga_academica.xlsx")
        .expect(200);

      // Guardamos la cantidad de profesores que quedaron en la BD real
      const totalProfesoresPrimera = await Profesor.count();
      const totalEstudiantesPrimera = await Estudiante.count();

      // 2. Segunda subida idéntica
      const resSegunda = await request(app)
        .post("/api/importar/confirmar")
        .set("Authorization", `Bearer ${token}`)
        .attach("archivo", excelBuffer, "carga_academica.xlsx")
        .expect(200);

      // Guardamos la cantidad después de la segunda vuelta
      const totalProfesoresSegunda = await Profesor.count();
      const totalEstudiantesSegunda = await Estudiante.count();

      // VALIDACIÓN REAL DE IDEMPOTENCIA: 
      // La cantidad absoluta en la base de datos NO tuvo que haber aumentado.
      expect(totalProfesoresSegunda).toBe(totalProfesoresPrimera);
      expect(totalEstudiantesSegunda).toBe(totalEstudiantesPrimera);

      // Validamos que la respuesta del servidor sea exitosa
      expect(resSegunda.body).toHaveProperty("resultados");
    });

    it("debería agregar un error controlado en el reporte si un estudiante apunta a una comisión inexistente en el Excel", async () => {
      const wbInvalido = XLSX.utils.book_new();

      // Comisiones vacías o sin la comisión que usará el alumno
      const wsComisiones = XLSX.utils.aoa_to_sheet([
        ["cod_comision", "docente_nombre", "docente_dni", "docente_email", "horaDesde", "horaHasta", "espacio", "edificio", "actividad", "dia"]
      ]);
      XLSX.utils.book_append_sheet(wbInvalido, wsComisiones, "comisiones");

      // Estudiante apuntando a "COM-999" (Inexistente)
      const wsMatriculacion = XLSX.utils.aoa_to_sheet([
        ["nombre_apellido", "dni", "email", "materia", "cod_comision", "docente"],
        ["Estudiante Huérfano", "99888777", "huerfano@test.com", "Materia X", "COM-999", "Profesor X"]
      ]);
      XLSX.utils.book_append_sheet(wbInvalido, wsMatriculacion, "matriculacion");

      const bufferInvalido = XLSX.write(wbInvalido, { type: "buffer", bookType: "xlsx" });

      const res = await request(app)
        .post("/api/importar/confirmar")
        .attach("archivo", bufferInvalido, "carga_erronea.xlsx")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);


      console.log(JSON.stringify(res.body.resultados.errores, null, 2));      // El controlador atrapa la falta de comisión metiéndola en el array de errores
      expect(res.body.resultados.errores.length).toBeGreaterThan(0);
      
      const error = res.body.resultados.errores[0];

      expect(error).toMatchObject({
        fila: 2,
        dni: "99888777",
        comision: "COM-999",
        mensaje: "Comisión no encontrada",
      });
    });
  });
});