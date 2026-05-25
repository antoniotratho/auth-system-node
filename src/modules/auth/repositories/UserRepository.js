const prisma = require('../../../shared/database/prisma');

class UserRepository {
  async findByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  }

  async findById(id) {
    return prisma.user.findUnique({ where: { id } });
  }

  async create(data) {
    return prisma.user.create({ data });
  }

  /**
   * Atualiza dados do usuário
   * @param {number} id - ID do usuário
   * @param {object} data - Dados a atualizar
   * @returns {Promise} Usuário atualizado
   */
  async update(id, data) {
    return prisma.user.update({
      where: { id },
      data
    });
  }

  /**
   * Deleta um usuário
   * @param {number} id - ID do usuário
   * @returns {Promise} Usuário deletado
   */
  async delete(id) {
    return prisma.user.delete({
      where: { id }
    });
  }

  /**
   * Incrementa tentativas de login falhadas
   * @param {number} id - ID do usuário
   * @returns {Promise} Usuário atualizado
   */
  async incrementFailedAttempts(id) {
    const user = await prisma.user.findUnique({ where: { id } });
    const newAttempts = (user?.failedAttempts || 0) + 1;
    
    // Bloquear após 5 tentativas por 15 minutos
    let lockUntil = null;
    if (newAttempts >= 5) {
      lockUntil = new Date(Date.now() + 15 * 60 * 1000);
    }

    return prisma.user.update({
      where: { id },
      data: {
        failedAttempts: newAttempts,
        lockUntil: lockUntil,
        lastFailedLoginAt: new Date()
      }
    });
  }

  /**
   * Reseta contador de tentativas falhadas
   * @param {number} id - ID do usuário
   * @returns {Promise} Usuário atualizado
   */
  async resetFailedAttempts(id) {
    return prisma.user.update({
      where: { id },
      data: {
        failedAttempts: 0,
        lockUntil: null
      }
    });
  }
}

module.exports = new UserRepository();

