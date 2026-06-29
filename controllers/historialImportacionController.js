const HistorialImportacionService = require('../services/historialImportacionService');

class HistorialImportacionController {

    /** Devuelve el historial de importaciones.*/
    static async listar(solicitud, respuesta) {
        try {
            const historialImportaciones =
                await HistorialImportacionService.listar();
            return respuesta.status(200).json(
                historialImportaciones
            );
        } catch (error) {
            console.error(
                'Error al obtener historial:',
                error.message
            );
            return respuesta.status(500).json({
                mensaje: 'Error al obtener historial de importaciones'
            });
        }
    }
}

module.exports = HistorialImportacionController;