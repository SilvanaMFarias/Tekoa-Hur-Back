const { Model, DataTypes } = require('sequelize');

class HistorialImportacion extends Model {
    static associate(models) {

        /**
         * Una importación pertenece a un usuario.
         * Un usuario puede realizar muchas importaciones.
         */
        HistorialImportacion.belongsTo(models.Usuario, {
            foreignKey: 'usuarioId',
            as: 'usuario'
        });

    }
}

module.exports = (sequelize) => {

    HistorialImportacion.init({

        /**
         * Identificador único del historial.
         */
        historialId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        /**
         * Fecha y hora de ejecución de la importación.
         */
        fechaEjecucion: {
            type: DataTypes.DATE,
            allowNull: false
        },

        /**
         * Usuario que ejecutó la importación.
         */
        usuarioId: {
            type: DataTypes.UUID,
            allowNull: false
        },

        /**
         * Módulo o proceso que realizó la importación.
         * Ejemplos:
         * GESTION_ESTUDIANTIL
         * DOCENTES
         * COMISIONES
         */
        origen: {
            type: DataTypes.STRING,
            allowNull: false
        },

        /**
         * Nombre del archivo importado.
         */
        nombreArchivo: {
            type: DataTypes.STRING,
            allowNull: false
        },

        /**
         * Contenido del archivo Excel importado.
         * Se almacena para permitir su descarga desde el historial de importaciones.
         */
        archivo: {
            type: DataTypes.BLOB,
            allowNull: false
        },
  
        /**
         * Descripción opcional de la importación.
         */
        descripcion: {
            type: DataTypes.STRING,
            allowNull: true
        },

        /**
         * Tipo de operación.
         * Actualmente sólo se utiliza CARGA_INICIAL.
         * Se deja preparado para futuras actualizaciones.
         */
        tipoOperacion: {
            type: DataTypes.ENUM(
                'CARGA_INICIAL',
                'ACTUALIZACION'
            ),
            allowNull: false,
            defaultValue: 'CARGA_INICIAL'
        },

        /**
         * Estado final de la ejecución.
         */
        estado: {
            type: DataTypes.ENUM(
                'EXITOSA',
                'ERROR'
            ),
            allowNull: false,
            defaultValue: 'EXITOSA'
        },

        /**
         * Cantidad total de errores detectados durante la importación.
         */
        cantidadErrores: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },

        /**
         * Información específica de la importación.
         * Se almacena como JSON para permitir distintos tipos
         * de importaciones sin modificar la estructura de la tabla.
         */
        detalle: {
            type: DataTypes.JSON,
            allowNull: true
        }

    }, {
        sequelize,
        modelName: 'HistorialImportacion',
        tableName: 'historial_importaciones'
    });

    return HistorialImportacion;
};