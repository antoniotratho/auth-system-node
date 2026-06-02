const { randomUUID } = require('crypto');
const logger = require('../../../shared/logger');
const UserRepository = require('../repositories/UserRepository');
const DataExportRepository = require('../repositories/DataExportRepository');
const ConsentRepository = require('../repositories/ConsentRepository');
const emailService = require('../../../shared/services/EmailService');
const hash = require('../../../shared/utils/hash');

class LGPDController {
  constructor() {
    this.getMyData = this.getMyData.bind(this);
    this.exportData = this.exportData.bind(this);
    this.downloadData = this.downloadData.bind(this);
    this.requestAccountDeletion = this.requestAccountDeletion.bind(this);
    this.listConsents = this.listConsents.bind(this);
    this.giveConsent = this.giveConsent.bind(this);
    this.revokeConsent = this.revokeConsent.bind(this);
  }

  buildUserExport(user, consents) {
    return {
      profile: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        twoFactorEnabled: user.twoFactorEnabled
      },
      security: {
        failedAttempts: user.failedAttempts,
        lockUntil: user.lockUntil,
        lastFailedLoginAt: user.lastFailedLoginAt
      },
      consents: consents.map((consent) => ({
        id: consent.id,
        type: consent.type,
        purpose: consent.purpose,
        version: consent.version,
        accepted: consent.accepted,
        acceptedAt: consent.acceptedAt,
        revokedAt: consent.revokedAt,
        ipAddress: consent.ipAddress,
        userAgent: consent.userAgent,
        createdAt: consent.createdAt
      }))
    };
  }

  async getMyData(req, res) {
    try {
      const { userId } = req.user;
      const user = await UserRepository.findById(userId);

      if (!user) {
        return res.status(404).json({ error: 'Usuario nao encontrado' });
      }

      const consents = await ConsentRepository.findByUserId(userId);
      const userData = this.buildUserExport(user, consents);

      logger.info({
        action: 'data_view_requested',
        userId,
        ip: req.ip
      });

      return res.status(200).json({
        message: 'Dados do usuario',
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

  async exportData(req, res) {
    try {
      const { userId } = req.user;
      const exportToken = randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await DataExportRepository.create({
        userId,
        token: exportToken,
        expiresAt
      });

      const downloadUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/download-data?token=${exportToken}`;

      logger.info({
        action: 'data_export_requested',
        userId,
        ip: req.ip
      });

      return res.status(200).json({
        message: 'Link de exportacao gerado com sucesso',
        downloadUrl,
        expiresAt,
        instruction: 'O link expira em 24 horas. Use-o para baixar seus dados em formato JSON.'
      });
    } catch (error) {
      logger.error({
        action: 'export_data_error',
        userId: req.user?.userId,
        error: error.message
      });
      return res.status(500).json({ error: 'Erro ao gerar exportacao' });
    }
  }

  async downloadData(req, res) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({ error: 'Token de exportacao obrigatorio' });
      }

      const exportRecord = await DataExportRepository.findByToken(token);
      if (!exportRecord) {
        return res.status(404).json({ error: 'Link de exportacao invalido' });
      }

      if (exportRecord.downloadedAt) {
        return res.status(410).json({ error: 'Este link de exportacao ja foi utilizado' });
      }

      if (exportRecord.expiresAt < new Date()) {
        return res.status(410).json({ error: 'Link de exportacao expirado' });
      }

      const user = await UserRepository.findById(exportRecord.userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario nao encontrado' });
      }

      const consents = await ConsentRepository.findByUserId(exportRecord.userId);
      const exportPayload = {
        message: 'Exportacao de dados pessoais',
        exportedAt: new Date(),
        data: this.buildUserExport(user, consents)
      };

      await DataExportRepository.markAsDownloaded(exportRecord.id);

      logger.info({
        action: 'data_export_downloaded',
        userId: exportRecord.userId,
        exportId: exportRecord.id,
        ip: req.ip
      });

      const filename = `dados-usuario-${user.id}.json`;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(JSON.stringify(exportPayload, null, 2));
    } catch (error) {
      logger.error({
        action: 'download_data_error',
        token: req.params?.token,
        error: error.message
      });
      return res.status(500).json({ error: 'Erro ao baixar exportacao' });
    }
  }

  async requestAccountDeletion(req, res) {
    try {
      const { userId } = req.user;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ error: 'Senha obrigatoria' });
      }

      const user = await UserRepository.findById(userId);
      const isPasswordValid = await hash.comparePassword(password, user.password);

      if (!isPasswordValid) {
        logger.warn({
          action: 'account_delete_invalid_password',
          userId,
          ip: req.ip
        });
        return res.status(401).json({ error: 'Senha incorreta' });
      }

      const deleteToken = randomUUID();
      const confirmUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/confirm-delete-account`;

      await emailService.sendAccountDeleteEmail(user.email, confirmUrl, deleteToken);

      logger.info({
        action: 'account_delete_requested',
        userId,
        ip: req.ip
      });

      return res.status(200).json({
        message: 'Email de confirmacao enviado',
        instruction: 'Clique no link enviado por email para confirmar a exclusao. O link expira em 15 minutos.'
      });
    } catch (error) {
      logger.error({
        action: 'account_delete_request_error',
        userId: req.user?.userId,
        error: error.message
      });
      return res.status(500).json({ error: 'Erro ao solicitar exclusao' });
    }
  }

  async listConsents(req, res) {
    try {
      const { userId } = req.user;
      const consents = await ConsentRepository.findByUserId(userId);

      return res.status(200).json({
        message: 'Consentimentos do usuario',
        consents: consents.map((consent) => ({
          id: consent.id,
          type: consent.type,
          purpose: consent.purpose,
          version: consent.version,
          accepted: consent.accepted,
          acceptedAt: consent.acceptedAt,
          revokedAt: consent.revokedAt,
          createdAt: consent.createdAt
        }))
      });
    } catch (error) {
      logger.error({
        action: 'list_consents_error',
        userId: req.user?.userId,
        error: error.message
      });
      return res.status(500).json({ error: 'Erro ao listar consentimentos' });
    }
  }

  async giveConsent(req, res) {
    try {
      const { userId } = req.user;
      const { type, purpose, accepted, version = '1.0' } = req.body;

      if (!type) {
        return res.status(400).json({ error: 'Tipo de consentimento obrigatorio' });
      }

      if (!purpose) {
        return res.status(400).json({ error: 'Finalidade do consentimento obrigatoria' });
      }

      if (accepted !== true) {
        return res.status(400).json({ error: 'Consentimento explicito obrigatorio' });
      }

      const consent = await ConsentRepository.upsertByUserTypeVersion(userId, type, version, {
        purpose,
        accepted: true,
        acceptedAt: new Date(),
        revokedAt: null,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      logger.info({
        action: 'consent_recorded',
        userId,
        type,
        version,
        purpose,
        ip: req.ip
      });

      return res.status(201).json({
        message: 'Consentimento registrado com sucesso',
        consent: {
          id: consent.id,
          type: consent.type,
          purpose: consent.purpose,
          version: consent.version,
          accepted: consent.accepted,
          acceptedAt: consent.acceptedAt,
          revokedAt: consent.revokedAt
        }
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

  async revokeConsent(req, res) {
    try {
      const { userId } = req.user;
      const consentId = Number(req.params.id);

      if (!Number.isInteger(consentId)) {
        return res.status(400).json({ error: 'Consentimento invalido' });
      }

      const consent = await ConsentRepository.findByIdForUser(consentId, userId);
      if (!consent) {
        return res.status(404).json({ error: 'Consentimento nao encontrado' });
      }

      if (consent.revokedAt) {
        return res.status(200).json({
          message: 'Consentimento ja estava revogado',
          consent
        });
      }

      const revokedConsent = await ConsentRepository.revoke(consentId);

      logger.info({
        action: 'consent_revoked',
        userId,
        consentId,
        type: revokedConsent.type,
        version: revokedConsent.version,
        ip: req.ip
      });

      return res.status(200).json({
        message: 'Consentimento revogado com sucesso',
        consent: revokedConsent
      });
    } catch (error) {
      logger.error({
        action: 'revoke_consent_error',
        userId: req.user?.userId,
        consentId: req.params?.id,
        error: error.message
      });
      return res.status(500).json({ error: 'Erro ao revogar consentimento' });
    }
  }
}

module.exports = new LGPDController();
