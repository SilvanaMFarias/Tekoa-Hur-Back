const request = require("supertest");
const app = require("../../app");
const { Aula, Edificio } = require("../../models");
const { crearEdificio, crearAula } = require("../setup/factories");  
const { generarTokenAdmin } = require("../setup/auth"); 

describe("Pruebas de Integración Reales - Aula Controller", () => {
  let token;
  let edificioA;
  let edificioB;
  let idEdificioA; // Guardamos el ID unificado acá
  let idEdificioB; // Guardamos el ID unificado acá
  let aula1;
  let aula2;
  let aula3;

  // es complemento al factory, ya que evita duplicacion del codigo y evita contaminacion de la bdd
  beforeEach(async () => {
    // 1. Generar token de autenticación
    token = generarTokenAdmin();

    // 2. Limpieza estricta de filas en cascada para evitar Locks en Postgres
    await Aula.destroy({ where: {}, cascade: true, force: true });
    await Edificio.destroy({ where: {}, cascade: true, force: true });

    // 3. Crear el escenario de pruebas con las factories reales
    edificioA = await crearEdificio({ nombre: "Pabellón de Ingeniería" });
    edificioB = await crearEdificio({ nombre: "Pabellón de Diseño" });

    // Unificamos los IDs dinámicamente según Sequelize
    idEdificioA = edificioA.edificioId || edificioA.id;
    idEdificioB = edificioB.edificioId || edificioB.id;

    // Aulas asociadas al Edificio A
    aula1 = await crearAula({ 
      sector: "Planta Baja", 
      numero: "101", 
      edificioId: idEdificioA 
    });
    aula2 = await crearAula({ 
      sector: "Primer Piso", 
      numero: "202", 
      edificioId: idEdificioA 
    });

    // Aula asociada al Edificio B
    aula3 = await crearAula({ 
      sector: "Planta Alta", 
      numero: "305", 
      edificioId: idEdificioB 
    });
  });

  describe("GET /api/aulas", () => {
    
    it("debería retornar todas las aulas existentes con su respectivo edificio incluido", async () => {
      const res = await request(app)
        .get("/api/aulas")
        .set("Authorization", `Bearer ${token}`) 
        .expect(200);

      // Deben venir las 3 aulas creadas en el escenario
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(3);

      // Verificar que incluya la relación eager-loading del edificio alias "edificio"
      expect(res.body[0]).toHaveProperty("edificio");
      expect(res.body[0].edificio).toHaveProperty("nombre");
    });

    it("debería filtrar correctamente las aulas por edificioId si se envía en la query", async () => {
      const res = await request(app)
        .get("/api/aulas")
        .query({ edificioId: idEdificioA })
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      // Solo deben retornar las 2 aulas que pertenecen al Edificio A
      expect(res.body.length).toBe(2);
      
      // Validar de manera estricta que todas pertenezcan al edificio correcto
      res.body.forEach((aula) => {
        expect(aula.edificioId).toBe(idEdificioA);
      });

      // Mapear números para corroborar consistencia de los datos reales insertados
      const numerosAulas = res.body.map(a => a.numero);
      expect(numerosAulas).toContain("101");
      expect(numerosAulas).toContain("202");
      expect(numerosAulas).not.toContain("305");
    });

    it("debería retornar una lista vacía si el edificioId enviado no tiene aulas asociadas", async () => {
      // Creamos un tercer edificio huérfano sin aulas asignadas
      const edificioVacio = await crearEdificio({ nombre: "Bloque Nuevo" });
      const idFiltroVacio = edificioVacio.edificioId || edificioVacio.id;

      const res = await request(app)
        .get("/api/aulas")
        .query({ edificioId: idFiltroVacio })
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBe(0);
    });
  });
});