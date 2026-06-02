const guaraniService = require("../services/guaraniService");

class GuaraniController {
    getPeriodosTekoa = async (req, res) => {
        const periodos = await guaraniService.getPeriodosTekoa();

        res.json(periodos);
    };
}

module.exports = new GuaraniController();