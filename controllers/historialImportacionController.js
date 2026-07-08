const HistorialImportacionService = require("../services/historialImportacionService");

const XLSX = require("xlsx");
const ExcelJS = require("exceljs");


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
     * Antes de enviarlo agrega una columna "Observación"
     * indicando los registros que no pudieron procesarse.
     *
     * @param {Object} solicitud Información recibida desde la petición HTTP.
     * @param {Object} respuesta Objeto utilizado para responder al cliente.
     */
    static async descargarArchivo(solicitud, respuesta) {

        try {

            // Obtener el identificador de la importación.
            const { historialId } = solicitud.params;

            // Buscar la importación en la base de datos.
            const historial =
                await HistorialImportacionService.obtenerArchivo(historialId);

            // Crear un nuevo libro de Excel.
            const workbook = new ExcelJS.Workbook();

            // Cargar el archivo almacenado en la base.
            await workbook.xlsx.load(historial.archivo);

            // Obtener la hoja donde se encuentran los estudiantes.
            const worksheet =
                workbook.getWorksheet("matriculacion");

            if (!worksheet) {
                throw new Error(
                    'No se encontró la hoja "matriculacion".'
                );
            }

            // Insertar una nueva columna al comienzo.
            worksheet.spliceColumns(1, 0, ["Observación"]);

            //si hay errores de importación, agregue la columna "Observación";
            //si no hubo errores, descargue igualmente el Excel.
            const errores = historial.detalle?.errores ?? [];

            errores.forEach((error) => {
                worksheet.getCell(`A${error.fila}`).value = error.mensaje;
            });

            // Generar el nuevo archivo.
            const buffer =
                await workbook.xlsx.writeBuffer();

            // Configurar la descarga.
            respuesta.setHeader(
                "Content-Disposition",
                `attachment; filename="${historial.nombreArchivo}"`
            );

            respuesta.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );

            // Enviar el archivo modificado.
            return respuesta.send(Buffer.from(buffer));

        } catch (error) {

            console.error(
                "Error al descargar el archivo:",
                error
            );

            return respuesta.status(404).json({
                message: error.message
            });

        }

    }
}

module.exports = HistorialImportacionController;