// controllers/aulaController.js
const { Aula, Edificio } = require("../models");
const BaseController = require("./baseController");
const BaseService = require("../services/baseService");

class AulaController extends BaseController {
  constructor() {
    super(new BaseService(Aula, [{ model: Edificio, as: "edificio" }]));
  }

  // 🔥 IMPORTANTE: arrow function
  getAll = async (req, res, next) => {
    try {
      console.log("🔥 MI GET ALL");

      const { edificioId } = req.query;

      console.log("QUERY:", req.query);

      const where = {};

      if (edificioId) {
        where.edificioId = edificioId;
      }

      console.log("WHERE:", where);

      const aulas = await Aula.findAll({
        where,
        include: [{ model: Edificio, as: "edificio" }],
      });

      console.log("Cantidad aulas:", aulas.length);

      res.json(aulas);
    } catch (error) {
      console.error(error);
      next(error);
    }
  };
}

module.exports = new AulaController();