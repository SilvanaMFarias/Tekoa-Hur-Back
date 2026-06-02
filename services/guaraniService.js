const AppError = require("../errors/AppError");

const DEFAULT_PERIODOS_TEKOA_URL =
  "https://guarani-testing.unahur.edu.ar/guarani/3.22/rest/v1/periodos-tekoa";

class GuaraniService {
  constructor() {
    this.periodosTekoaUrl =
      process.env.GUARANI_PERIODOS_TEKOA_URL ||
      process.env.GUARANI_API_URL ||
      DEFAULT_PERIODOS_TEKOA_URL;
  }

  getAuthHeader() {
    const user = process.env.GUARANI_API_USER;
    const pass = process.env.GUARANI_API_PASS;

    if (!user || !pass) {
      throw AppError.badRequest(
        "Faltan configurar las credenciales de Guarani."
      );
    }

    const token = Buffer
      .from(`${user}:${pass}`)
      .toString("base64");

    return `Basic ${token}`;
  }

  async getPeriodosTekoa() {
    const response = await fetch(this.periodosTekoaUrl, {
      headers: {
        Authorization: this.getAuthHeader(),
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new AppError(
        `Guarani respondio con estado ${response.status}.`,
        response.status
      );
    }

    return response.json();
  }
}

module.exports = new GuaraniService();
