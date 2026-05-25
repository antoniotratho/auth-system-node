const prisma = require('../../../shared/database/prisma');

class ConsentRepository {
  /**
   * Registrar novo consentimento
   */
  async create(data) {
    return prisma.consent.create({ data });
  }

  /**
   * Buscar consentimento específico
   */
  async findByUserIdAndType(userId, type) {
    return prisma.consent.findFirst({
      where: {
        userId: userId,
        type: type,
        accepted: true,
        revokedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Listar todos os consentimentos do usuário
   */
  async findByUserId(userId) {
    return prisma.consent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Revogar consentimento
   */
  async revoke(id) {
    return prisma.consent.update({
      where: { id },
      data: { revokedAt: new Date() }
    });
  }

  /**
   * Verificar consentimento ativo
   */
  async isConsentGiven(userId, type) {
    const consent = await this.findByUserIdAndType(userId, type);
    return !!consent && !consent.revokedAt;
  }
}

module.exports = new ConsentRepository();
