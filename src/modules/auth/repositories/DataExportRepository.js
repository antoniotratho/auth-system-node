const prisma = require('../../../shared/database/prisma');

class DataExportRepository {
  /**
   * Criar novo token de export
   */
  async create(data) {
    return prisma.dataExport.create({ data });
  }

  /**
   * Buscar por token
   */
  async findByToken(token) {
    return prisma.dataExport.findUnique({
      where: { token }
    });
  }

  /**
   * Buscar exports do usuário
   */
  async findByUserId(userId) {
    return prisma.dataExport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Marcar como baixado
   */
  async markAsDownloaded(id) {
    return prisma.dataExport.update({
      where: { id },
      data: { downloadedAt: new Date() }
    });
  }

  /**
   * Deletar exports expirados
   */
  async deleteExpired() {
    return prisma.dataExport.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        downloadedAt: null
      }
    });
  }

  /**
   * Deletar todos os exports de um usuário
   */
  async deleteByUserId(userId) {
    return prisma.dataExport.deleteMany({
      where: { userId }
    });
  }
}

module.exports = new DataExportRepository();
