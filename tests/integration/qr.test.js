const request = require('supertest');
const app = require("../../app");
const { Aula,Edificio } = require("../../models");
const { crearAula } = require("../setup/factories");

describe('GET /api/qr/validar', () => {
  
  // UUID válido sintácticamente para Postgres, pero que no existirá en la DB
  const uuidInexistente = '00000000-0000-0000-0000-000000000000';

  beforeEach(async () => {
    // Limpiamos las tablas antes de cada test para aislar el entorno
    // Se elimina Aula primero por la restricción de FK hacia Edificio
    await Aula.destroy({ where: {}, truncate: true, cascade: true });
    await Edificio.destroy({ where: {}, truncate: true, cascade: true });
  });

  // 1. Caso de Éxito (200)
  it('debería retornar 200 y ok: true si el QR y los IDs son válidos', async () => {
    // La factory se encarga de crear el edificio asociado automáticamente
    const aula = await crearAula({ rtoken: 'token_valido_123' });

    const response = await request(app)
      .get('/api/qr/validar') 
      .query({ 
        edificioId: aula.edificioId, 
        aulaId: aula.aulaId, 
        rtoken: 'token_valido_123' 
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      message: "QR válido"
    });
  });

  // 2. Caso de Token Inválido (403)
  it('debería retornar 403 si el rtoken no coincide con el de la DB', async () => {
    const aula = await crearAula({ rtoken: 'token_real_de_la_db' });

    const response = await request(app)
      .get('/api/qr/validar')
      .query({ 
        edificioId: aula.edificioId, 
        aulaId: aula.aulaId, 
        rtoken: 'token_trucho_999' 
      });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      ok: false,
      message: "QR inválido o expirado"
    });
  });

  // 3. Caso de Aula/Edificio inexistente (403)
  it('debería retornar 403 si el aula o el edificio no existen en la DB', async () => {
    // Ejecutamos la consulta pasándole un UUID válido en formato, pero que no está insertado
    const response = await request(app)
      .get('/api/qr/validar')
      .query({ 
        edificioId: uuidInexistente, 
        aulaId: uuidInexistente, 
        rtoken: 'algun_token' 
      });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      ok: false,
      message: "QR inválido o expirado"
    });
  });

  // 4. Caso de Error Interno (500)
  it('debería retornar 500 si ocurre un error inesperado en la base de datos', async () => {
    // Mockeamos findOne para forzar que el catch del controlador capture la excepción
    const spyFindOne = jest.spyOn(Aula, 'findOne').mockRejectedValue(new Error('DB Crash'));

    const response = await request(app)
      .get('/api/qr/validar')
      .query({ 
        edificioId: uuidInexistente, 
        aulaId: uuidInexistente, 
        rtoken: 'cualquier_cosa' 
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: "Error interno"
    });

    // Importante restaurar el método original para no romper otros archivos de tests
    spyFindOne.mockRestore();
  });
});