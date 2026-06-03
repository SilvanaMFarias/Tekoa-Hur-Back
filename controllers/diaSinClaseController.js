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
      console.error(
        "Error en DiaSinClaseController.getFormData:",
        error
      );

      return res.status(500).json({
        error:
          "Error interno al recopilar los datos para el formulario."
      });
    }
  };

  create = async (req, res) => {
    try {
      const { fecha, comisionId } = req.body;

      const existente = await this.service.findOne({
        where: {
          fecha,
          comisionId: comisionId ?? null
        }
      });

      if (existente) {
        return res.status(409).json({
          message:
            "Ya existe un día sin clase para esa fecha y comisión."
        });
      }

      const item = await this.service.create(req.body);

      return res.status(201).json(item);

    } catch (error) {
      console.error(
        "Error en DiaSinClaseController.create:",
        error
      );

      return res.status(500).json({
        message: "Error al crear el día sin clase."
      });
    }
  };
}

module.exports = new DiaSinClaseController();