require("../setup/test-db"); // Tu configuración de entorno de pruebas
const sequelize = require("../../config/database");
const { Asistencia, Horario, Matricula, Comision } = require("../../models");
const ausenciasAutomaticasService = require("../../services/ausenciasAutomaticasService");
const guaraniService = require("../../services/guaraniService");

// Importamos tus factories para generar datos válidos respetando las restricciones de la DB
const { crearComision, crearEstudiante, crearAsistencia, crearHorario, crearMatricula } = require("../setup/factories"); 

// Mockeamos el servicio de Guaraní para controlar las fechas del período académico
jest.mock("../../services/guaraniService");

describe("Tests Unitarios/Funcionales - ausenciasAutomaticasService", () => {
    
    beforeAll(async () => {
        // Usamos fake timers defensivos por si el servicio levanta crons internos de fondo
        jest.useFakeTimers();
        await sequelize.sync({ force: true });
    });

    beforeEach(async () => {
        await Asistencia.destroy({ where: {}, truncate: true, cascade: true });
        await Horario.destroy({ where: {}, truncate: true, cascade: true });
        await Matricula.destroy({ where: {}, truncate: true, cascade: true });
        await Comision.destroy({ where: {}, truncate: true, cascade: true });
        jest.clearAllMocks();
    });

    afterAll(async () => {
        // Limpieza absoluta para no dejar handles ni transacciones abiertas en la DB de pruebas
        await Asistencia.destroy({ where: {}, truncate: true, cascade: true });
        await Matricula.destroy({ where: {}, truncate: true, cascade: true });
        
        jest.useRealTimers();
        await sequelize.close();
    });

    it("Debería generar AUSENTE solo para los alumnos matriculados que NO registraron asistencia", async () => {
        // 1. Simular período académico vigente
        guaraniService.getPeriodosTekoa.mockResolvedValue([
            {
                periodo: "256",
                fecha_inicio_dictado: "2026-01-01",
                fecha_fin_dictado: "2026-12-31"
            }
        ]);

        const hoy = new Date();
        const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
        const diaSemanaHoy = dias[hoy.getDay()];
        
        // FIX: Formateamos la fecha usando la hora LOCAL para evitar que cambie de día en UTC
        const anio = hoy.getFullYear();
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const dia = String(hoy.getDate()).padStart(2, '0');
        const fechaHoy = `${anio}-${mes}-${dia}`;

        // Calculamos horas dinámicas basadas en el momento exacto de la ejecución
        // Clase simulada: empezó hace 2 horas y terminó hace 5 minutos
        const haceDosHoras = new Date(hoy.getTime() - 2 * 60 * 60 * 1000);
        const haceCincoMinutos = new Date(hoy.getTime() - 5 * 60 * 1000);
        
        const horaDesdeDinamica = haceDosHoras.toTimeString().slice(0, 5); 
        const horaHastaDinamica = haceCincoMinutos.toTimeString().slice(0, 5); 
        const horaRegistroDinamica = haceDosHoras.toTimeString().slice(0, 5);

        // 2. Crear Comisión válida con la factory
        const comision = await crearComision();

        // 3. Crear Horario dinámico acoplado a la hora actual de tu computadora
        await crearHorario({
            comisionId: comision.comisionId,
            diaSemana: diaSemanaHoy,
            horaDesde: horaDesdeDinamica,
            horaHasta: horaHastaDinamica
        });

        // 4. Crear alumnos y asociarlos usando tu propia factory de Matrícula 
        const alumno1 = await crearEstudiante({ dni: "11111111" });
        const alumno2 = await crearEstudiante({ dni: "22222222" });

        await crearMatricula({ comisionId: comision.comisionId, estudianteDni: alumno1.dni });
        await crearMatricula({ comisionId: comision.comisionId, estudianteDni: alumno2.dni });

        // 5. Registrar asistencia previa (PRESENTE) para el alumno 1 usando la misma hora de inicio
        await crearAsistencia({
            usuarioId: alumno1.dni,
            estudianteDni: alumno1.dni,
            alumnoDni: alumno1.dni,
            comisionId: comision.comisionId,
            fecha: fechaHoy,
            horaRegistro: horaRegistroDinamica,
            estado: "PRESENTE"
        });

        // 6. Ejecutar el servicio
        const resultado = await ausenciasAutomaticasService.consolidarClasesFinalizadas();

        // 7. Verificaciones
        expect(resultado.procesadas).toBe(1);
        expect(resultado.creados).toBe(1);

        // Verificar el ausente del alumno 2 de manera dinámica según el esquema
        const complianceKey = alumno2.usuarioId ? 'usuarioId' : 'estudianteDni';
        const primerAusente = await Asistencia.findOne({ where: { estado: "AUSENTE" } });
        const complianceKeyActual = primerAusente && primerAusente[complianceKey] ? complianceKey : 'usuarioId';

        const asistenciaAusente = await Asistencia.findOne({
            where: { [complianceKeyActual]: "22222222", fecha: fechaHoy }
        });
        expect(asistenciaAusente).not.toBeNull();
        expect(asistenciaAusente.estado).toBe("AUSENTE");

        // Verificar que el alumno 1 conserve su PRESENTE
        const asistenciaPresente = await Asistencia.findOne({
            where: { [complianceKeyActual]: "11111111", fecha: fechaHoy }
        });
        expect(asistenciaPresente.estado).toBe("PRESENTE");
    });

    it("No debería procesar ni generar ausencias si se está fuera del período académico", async () => {
        guaraniService.getPeriodosTekoa.mockResolvedValue([
            {
                periodo: "256",
                fecha_inicio_dictado: "2025-01-01",
                fecha_fin_dictado: "2025-12-31"
            }
        ]);

        const resultado = await ausenciasAutomaticasService.consolidarClasesFinalizadas();

        expect(resultado.procesadas).toBe(0);
        expect(resultado.creados).toBe(0);
    });
});