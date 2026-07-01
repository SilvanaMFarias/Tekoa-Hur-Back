// controllers/estudianteController.js
const { Estudiante, Comision, Materia } = require("../models");
const BaseController = require("./baseController");
const BaseService = require("../services/baseService");
 
class EstudianteController extends BaseController {
  constructor() {
    // Incluimos la comisión y, dentro de cada comisión, la materia.
    // Así el frontend recibe { comisiones: [ { cod_comision, materia: { nombre } } ] }.
    super(
      new BaseService(Estudiante, [
        {
          model: Comision,
          as: "comisiones",
          include: [{ model: Materia, as: "materia" }],
        },
      ])
    );
  }
}
 
module.exports = new EstudianteController();