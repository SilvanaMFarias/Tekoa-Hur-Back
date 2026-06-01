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
}

module.exports = new DiaSinClaseController();