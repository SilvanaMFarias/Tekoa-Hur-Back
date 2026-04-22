const { sequelize } = require("../models");

class BaseService {
  constructor(model, include = []) {
    this.model = model;
    this.include = include;
    this.primaryKey = model.primaryKeyAttribute || "id";
  }

  getAll() {
    return this.model.findAll({ include: this.include });
  }

  getById(id) {
    return this.model.findByPk(id, { include: this.include });
  }

  async create(data) {
    return sequelize.transaction(async (transaction) => {
      return this.model.create(data, { transaction });
    });
  }

  async update(id, data) {
    return sequelize.transaction(async (transaction) => {
      const [updated] = await this.model.update(data, {
        where: { [this.primaryKey]: id },
        transaction,
      });
      return updated;
    });
  }

  async delete(id) {
    return sequelize.transaction(async (transaction) => {
      return this.model.destroy({ where: { [this.primaryKey]: id }, transaction });
    });
  }
}

module.exports = BaseService;
