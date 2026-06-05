// controllers/diaSinClaseController.js
const BaseController = require("./baseController");
const diaSinClaseService = require("../services/diaSinClaseService");

class DiaSinClaseController extends BaseController {
  constructor() {
    super(diaSinClaseService);
  }

  getFormData = async (req, res) => {
    try {
      const data = await this.service.getFormData();
      return res.status(200).json(data);
    } catch (error) {
      console.error("Error en DiaSinClaseController.getFormData:", error);
      return res.status(500).json({
        error: "Error interno al recopilar los datos para el formulario."
      });
    }
  };

  create = async (req, res) => {
    try {
      const { fecha, comisionId } = req.body;

      // Validaciones de estructura básicas
      if (!fecha || !comisionId) {
        return res.status(400).json({ 
          message: "Faltan datos obligatorios. Se requiere 'fecha' y 'comisionId'." 
        });
      }

      // Ejecutamos la validación en el servicio
      const conflicto = await this.service.verificarConflictoComision(fecha, comisionId);

      if (conflicto) {
        // Caso A: La fecha coincide con un feriado del calendario fijo
        if (conflicto.tipo === "feriado") {
          return res.status(409).json({
            message: `No se puede registrar el día libre: la fecha ${fecha} ya es el feriado institucional "${conflicto.datos.descripcion}".`
          });
        }

        // Caso B: Coincidencia exacta de Fecha y Comisión
        if (conflicto.tipo === "comision_duplicada") {
          return res.status(409).json({
            message: `La comisión seleccionada ya tiene registrado un 'Día sin clase' para la fecha ${fecha}.`
          });
        }
      }

      // Si pasa los controles, se registra directamente
      const item = await this.service.create(req.body);
      return res.status(201).json(item);

    } catch (error) {
      console.error("Error en DiaSinClaseController.create:", error);
      return res.status(500).json({
        message: "Error interno del servidor al procesar el alta del día sin clase."
      });
    }
  };
}

module.exports = new DiaSinClaseController();