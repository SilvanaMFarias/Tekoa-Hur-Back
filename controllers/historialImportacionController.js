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
    /**
     * Descarga el archivo original asociado a una importación.
     *
     * @param {Object} solicitud  Información recibida desde la petición HTTP.
     * @param {Object} respuesta  Objeto utilizado para responder al cliente.
     */
    static async descargarArchivo(solicitud, respuesta) {

        try {
            // Obtener el identificador de la importación desde la URL.
            const { historialId } = solicitud.params;
            // Buscar la importación en la base de datos.
            const historial =
                await HistorialImportacionService.obtenerArchivo(historialId);
            // Indicar al navegador que la respuesta es un archivo descargable.
            respuesta.setHeader(
                "Content-Disposition",
                `attachment; filename="${historial.nombreArchivo}"`
            );
            // Informar el tipo de archivo que se está enviando.
            respuesta.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );
            // Enviar el contenido del archivo almacenado en la base de datos.
            return respuesta.send(historial.archivo);

        } catch (error) {
            console.error("Error al descargar el archivo:", error);
            return respuesta.status(404).json({
                message: error.message
            });
        }
    }
}

module.exports = HistorialImportacionController;