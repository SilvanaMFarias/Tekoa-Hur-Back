const { HistorialImportacion } = require('../models');

class HistorialImportacionService {

    /**
     * Este método es genérico y puede ser reutilizado por cualquier
     * proceso de importación del sistema:
     *
     * - Gestión Estudiantil
     * - Docentes
     * - Comisiones
     * - Espacios
     * - Futuras importaciones
     *
     * @param {Object} datos Información de la importación.
     * @returns {Promise<HistorialImportacion>}
     */
    static async registrar(datos) {

        const historial = await HistorialImportacion.create({

            /** Fecha y hora en que se ejecutó la importación. */
            fechaEjecucion: new Date(),
            /** Usuario que realizó la operación. */
            usuarioId: datos.usuarioId,
            /** Módulo que ejecutó la importación.
             * Ejemplo:GESTION_ESTUDIANTIL - DOCENTES- COMISIONES */
            origen: datos.origen,
            /** Nombre del archivo importado.*/
            nombreArchivo: datos.nombreArchivo,
            /** Descripción opcional. */
            descripcion: datos.descripcion,
            /**
             * Tipo de operación.
             * Actualmente: CARGA_INICIAL
             * Futuro: ACTUALIZACION
             */
            tipoOperacion: datos.tipoOperacion,
            /**
             * Estado final de la ejecución. EXITOSA o ERROR */
            estado: datos.estado,
            /** Cantidad de errores encontrados. */
            cantidadErrores: datos.cantidadErrores || 0,
            /**
             * Información específica de la importación.
             * Se almacena como JSON para evitar crear
             * columnas específicas por cada tipo de carga.
             */
            detalle: datos.detalle
        });

        return historial;
    }

    /** Obtiene todas las importaciones registradas. */
    static async listar() {

        return await HistorialImportacion.findAll({

            order: [
                ['fechaEjecucion', 'DESC']
            ]

        });

    }
}

module.exports = HistorialImportacionService;