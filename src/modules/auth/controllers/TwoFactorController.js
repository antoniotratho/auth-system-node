const twoFactorService = require('../../../shared/utils/twoFactor');
const emailService = require('../../../shared/services/EmailService');
const logger = require('../../../shared/logger');
const UserRepository = require('../repositories/UserRepository');

class TwoFactorController {
  /**
   * POST /api/auth/2fa/setup
   * Inicia setup de 2FA - retorna QR code
   */
  async setupTwoFactor(req, res) {
    try {
      const { userId } = req.user;

      // Gerar secret e QR code
      const secret = twoFactorService.generateSecret(`user-${userId}`);
      const qrCode = await twoFactorService.generateQRCode(secret.otpauth_url);

      logger.info({
        action: '2fa_setup_initiated',
        userId: userId,
        ip: req.ip
      });

      return res.status(200).json({
        message: '2FA setup iniciado',
        secret: secret.secret,
        otpauthUrl: secret.otpauth_url,
        qrCode: qrCode,
        backupCodes: secret.backup_codes,
        totp: {
          issuer: 'AuthSystem',
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          serverTime: new Date().toISOString()
        },
        instruction: 'Escaneie o QR code e informe o codigo atual de 6 digitos do app authenticator'
      });
    } catch (error) {
      logger.error({
        action: '2fa_setup_error',
        userId: req.user?.userId,
        error: error.message
      });
      return res.status(500).json({ error: 'Erro ao configurar 2FA' });
    }
  }

  /**
   * POST /api/auth/2fa/verify-setup
   * Verifica token TOTP e ativa 2FA
   */
  async verifyTwoFactorSetup(req, res) {
    try {
      const { userId } = req.user;
      const { secret, token } = req.body;

      if (!secret || !token) {
        return res.status(400).json({
          error: 'Secret e token TOTP são obrigatórios'
        });
      }

      // Validar token TOTP
      const isValid = twoFactorService.verifyToken(secret, token);
      if (!isValid) {
        logger.warn({
          action: '2fa_verification_failed',
          userId: userId,
          reason: 'invalid_token'
        });
        return res.status(401).json({ error: 'Token TOTP inválido' });
      }

      // Salvar secret no usuário e ativar 2FA
      await UserRepository.update(userId, {
        twoFactorSecret: secret,
        twoFactorEnabled: true
      });

      logger.info({
        action: '2fa_enabled',
        userId: userId,
        ip: req.ip
      });

      return res.status(200).json({
        message: '2FA ativado com sucesso',
        status: 'active'
      });
    } catch (error) {
      logger.error({
        action: '2fa_verify_error',
        userId: req.user?.userId,
        error: error.message
      });
      return res.status(500).json({ error: 'Erro ao ativar 2FA' });
    }
  }

  /**
   * POST /api/auth/login/2fa
   * Valida token TOTP após login primário (requer tempToken)
   */
  async validateTwoFactor(req, res) {
    try {
      const { userId } = req.user; // vem do authMiddleware com temporary: true
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: 'Token TOTP obrigatório' });
      }

      // Buscar secret do usuário
      const user = await UserRepository.findById(userId);
      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        logger.warn({
          action: '2fa_validation_failed',
          userId: userId,
          reason: '2fa_not_enabled'
        });
        return res.status(401).json({ error: '2FA não está ativado' });
      }

      // Validar token
      const isValid = twoFactorService.verifyToken(user.twoFactorSecret, token);
      if (!isValid) {
        logger.warn({
          action: '2fa_validation_failed',
          userId: userId,
          reason: 'invalid_token'
        });
        return res.status(401).json({ error: 'Token TOTP inválido' });
      }

      // Gerar JWT final (sem temporary flag)
      const jwt = require('../../../shared/utils/jwt');
      const finalToken = jwt.generateJWT({ userId: user.id });

      logger.info({
        action: '2fa_validation_success',
        userId: userId,
        ip: req.ip
      });

      return res.status(200).json({
        message: 'Autenticação de dois fatores validada',
        token: finalToken,
        expiresIn: 3600
      });
    } catch (error) {
      logger.error({
        action: '2fa_validation_error',
        userId: req.user?.userId,
        error: error.message
      });
      return res.status(500).json({ error: 'Erro ao validar 2FA' });
    }
  }

  /**
   * POST /api/auth/2fa/disable
   * Desativa 2FA
   */
  async disableTwoFactor(req, res) {
    try {
      const { userId } = req.user;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ error: 'Senha obrigatória' });
      }

      // Verificar senha
      const user = await UserRepository.findById(userId);
      const hash = require('../../../shared/utils/hash');
      const isPasswordValid = await hash.comparePassword(password, user.password);

      if (!isPasswordValid) {
        logger.warn({
          action: '2fa_disable_failed',
          userId: userId,
          reason: 'invalid_password'
        });
        return res.status(401).json({ error: 'Senha incorreta' });
      }

      // Desativar 2FA
      await UserRepository.update(userId, {
        twoFactorEnabled: false,
        twoFactorSecret: null
      });

      logger.info({
        action: '2fa_disabled',
        userId: userId,
        ip: req.ip
      });

      return res.status(200).json({
        message: '2FA desativado com sucesso'
      });
    } catch (error) {
      logger.error({
        action: '2fa_disable_error',
        userId: req.user?.userId,
        error: error.message
      });
      return res.status(500).json({ error: 'Erro ao desativar 2FA' });
    }
  }
}

module.exports = new TwoFactorController();
