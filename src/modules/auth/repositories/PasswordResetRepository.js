const prisma = require('../../../shared/database/prisma');

class PasswordResetRepository {
  /**
   * Criar novo token de reset
   */
  async create(data) {
    return prisma.passwordReset.create({ data });
  }

  /**
   * Buscar por token
   */
  async findByToken(token) {
    return prisma.passwordReset.findUnique({
      where: { token }
    });
  }

  /**
   * Buscar por ID
   */
  async findById(id) {
    return prisma.passwordReset.findUnique({
      where: { id }
    });
  }

  /**
   * Listar tokens ativos de um usuário
   */
  async findActiveByUserId(userId) {
    return prisma.passwordReset.findMany({
      where: {
        userId: userId,
        usedAt: null,
        expiresAt: { gt: new Date() }
      }
    });
  }

  /**
   * Marcar token como usado
   */
  async markAsUsed(id) {
    return prisma.passwordReset.update({
      where: { id },
      data: { usedAt: new Date() }
    });
  }

  /**
   * Deletar token expirado
   */
  async deleteExpired() {
    return prisma.passwordReset.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });
  }

  /**
   * Deletar todos os tokens de um usuário
   */
  async deleteByUserId(userId) {
    return prisma.passwordReset.deleteMany({
      where: { userId }
    });
  }
}

module.exports = new PasswordResetRepository();
