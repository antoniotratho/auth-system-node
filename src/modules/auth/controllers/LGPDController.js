const { v4: uuidv4 } = require('uuid');
const logger = require('../../../shared/logger');
const UserRepository = require('../repositories/UserRepository');
const DataExportRepository = require('../repositories/DataExportRepository');
const ConsentRepository = require('../repositories/ConsentRepository');
const PasswordResetRepository = require('../repositories/PasswordResetRepository');
const emailService = require('../../../shared/services/EmailService');
const hash = require('../../../shared/utils/hash');

class LGPDController {
  /**
   * GET /api/auth/my-data
   * Retorna todos os dados do usuário
   */
  async getMyData(req, res) {
    try {
      const { userId } = req.user;

      // Buscar dados do usuário
      const user = await UserRepository.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Buscar histórico de consentimentos
      const consents = await ConsentRepository.findByUserId(userId);

      // Preparar dados sem senha
      const userData = {
        profile: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          twoFactorEnabled: user.twoFactorEnabled
        },
        security: {
          failedAttempts: user.failedAttempts,
          lockUntil: user.lockUntil,
          lastFailedLoginAt: user.lastFailedLoginAt
        },
        consents: consents.map(c => ({
          type: c.type,
          version: c.version,
          accepted: c.accepted,
          acceptedAt: c.acceptedAt,
          revokedAt: c.revokedAt
        }))
      };

      logger.info({
        action: 'data_view_requested',
        userId: userId,
        ip: req.ip
      });

      return res.status(200).json({
        message: 'Dados do usuário',
        data: userData,
        exportedAt: new Date()
      });
    } catch (error) {
      logger.error({
        action: 'get_my_data_error',
        userId: req.user?.userId,
        error: error.message
      });
      return res.status(500).json({ error: 'Erro ao buscar dados' });
    }
  }

  /**
   * POST /api/auth/export-data
   * Gera link de download para exportar todos os dados em JSON
   */
  async exportData(req, res) {
    try {
      const { userId } = req.user;

      // Gerar token e link de export
      const exportToken = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

      await DataExportRepository.create({
        userId: userId,
        token: exportToken,
        expiresAt: expiresAt
      });

      const downloadUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/download-data?token=${exportToken}`;

      logger.info({
        action: 'data_export_requested',
        userId: userId,
        ip: req.ip
      });

      return res.status(200).json({
        message: 'Link de exportação gerado com sucesso',
        downloadUrl: downloadUrl,
        expiresAt: expiresAt,
        instruction: 'O link expira em 24 horas. Use-o para baixar seus dados em formato JSON.'
      });
    } catch (error) {
      logger.error({
        action: 'export_data_error',
        userId: req.user?.userId,
        error: error.message
      });
      return res.status(500).json({ error: 'Erro ao gerar exportação' });
    }
  }

  /**
   * POST /api/auth/delete-account
   * Inicia processo de exclusão de conta
   */
  async requestAccountDeletion(req, res) {
    try {
      const { userId } = req.user;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ error: 'Senha obrigatória' });
      }

      // Verificar senha
      const user = await UserRepository.findById(userId);
      const isPasswordValid = await hash.comparePassword(password, user.password);

      if (!isPasswordValid) {
        logger.warn({
          action: 'account_delete_invalid_password',
          userId: userId,
          ip: req.ip
        });
        return res.status(401).json({ error: 'Senha incorreta' });
      }

      // Gerar token de confirmação
      const deleteToken = uuidv4();
      const confirmUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/confirm-delete-account`;

      // TODO: Salvar token em cache/DB com expiração 15 minutos

      // Enviar email de confirmação
      await emailService.sendAccountDeleteEmail(user.email, confirmUrl, deleteToken);

      logger.info({
        action: 'account_delete_requested',
        userId: userId,
        ip: req.ip
      });

      return res.status(200).json({
        message: 'Email de confirmação enviado',
        instruction: 'Clique no link enviado por email para confirmar a exclusão. O link expira em 15 minutos.'
      });
    } catch (error) {
      logger.error({
        action: 'account_delete_request_error',
        userId: req.user?.userId,
        error: error.message
      });
      return res.status(500).json({ error: 'Erro ao solicitar exclusão' });
    }
  }

  /**
   * POST /api/auth/consent
   * Registrar consentimento do usuário
   */
  async giveConsent(req, res) {
    try {
      const { userId } = req.user;
      const { type, accepted, version = '1.0' } = req.body;

      if (!type) {
        return res.status(400).json({ error: 'Tipo de consentimento obrigatório' });
      }

      // Criar registro de consentimento
      await ConsentRepository.create({
        userId: userId,
        type: type,
        version: version,
        accepted: accepted || false,
        acceptedAt: accepted ? new Date() : null,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      logger.info({
        action: 'consent_recorded',
        userId: userId,
        type: type,
        accepted: accepted,
        ip: req.ip
      });

      return res.status(201).json({
        message: 'Consentimento registrado com sucesso',
        type: type,
        accepted: accepted
      });
    } catch (error) {
      logger.error({
        action: 'consent_error',
        userId: req.user?.userId,
        error: error.message
      });
      return res.status(500).json({ error: 'Erro ao registrar consentimento' });
    }
  }
}

module.exports = new LGPDController();
