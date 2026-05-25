const { v4: uuidv4 } = require('uuid');
const logger = require('../../../shared/logger');
const UserRepository = require('../repositories/UserRepository');
const PasswordResetRepository = require('../repositories/PasswordResetRepository');
const emailService = require('../../../shared/services/EmailService');
const hash = require('../../../shared/utils/hash');

class PasswordResetController {
  /**
   * POST /api/auth/forgot-password
   * Solicitação de recuperação de senha
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email obrigatório' });
      }

      // Verificar se usuário existe
      const user = await UserRepository.findByEmail(email);
      if (!user) {
        // Por segurança, não revelar se email existe
        logger.warn({
          action: 'forgot_password_user_not_found',
          email: email,
          ip: req.ip
        });
        return res.status(200).json({
          message: 'Se o email existe em nosso sistema, você receberá um link de recuperação'
        });
      }

      // Gerar token de reset
      const resetToken = uuidv4();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

      // Salvar token no banco
      await PasswordResetRepository.create({
        userId: user.id,
        token: resetToken,
        expiresAt: expiresAt
      });

      // Montar URL de reset
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password`;

      // Enviar email
      await emailService.sendPasswordResetEmail(email, resetToken, resetUrl);

      logger.info({
        action: 'forgot_password_requested',
        email: email,
        userId: user.id,
        ip: req.ip
      });

      return res.status(200).json({
        message: 'Se o email existe em nosso sistema, você receberá um link de recuperação'
      });
    } catch (error) {
      logger.error({
        action: 'forgot_password_error',
        email: req.body?.email,
        error: error.message
      });
      return res.status(500).json({ error: 'Erro ao processar recuperação de senha' });
    }
  }

  /**
   * POST /api/auth/reset-password/:token
   * Redefinir senha com token
   */
  async resetPassword(req, res) {
    try {
      const { token } = req.params;
      const { password, passwordConfirm } = req.body;

      if (!password || !passwordConfirm) {
        return res.status(400).json({ error: 'Senha e confirmação são obrigatórias' });
      }

      if (password !== passwordConfirm) {
        return res.status(400).json({ error: 'Senhas não coincidem' });
      }

      // Validar força da senha
      const AuthService = require('../services/AuthService');
      if (!AuthService.isStrongPassword(password)) {
        return res.status(400).json({
          error: 'Senha fraca. Mínimo 8 caracteres, incluindo maiúscula, número e caractere especial'
        });
      }

      // Buscar token
      const resetRequest = await PasswordResetRepository.findByToken(token);
      if (!resetRequest) {
        logger.warn({
          action: 'reset_password_token_not_found',
          token: token.substring(0, 10) + '...',
          ip: req.ip
        });
        return res.status(401).json({ error: 'Token inválido' });
      }

      // Validar expiração
      if (resetRequest.expiresAt < new Date()) {
        logger.warn({
          action: 'reset_password_token_expired',
          token: token.substring(0, 10) + '...',
          userId: resetRequest.userId
        });
        return res.status(401).json({ error: 'Token expirado' });
      }

      // Validar se já foi usado
      if (resetRequest.usedAt) {
        logger.warn({
          action: 'reset_password_token_already_used',
          token: token.substring(0, 10) + '...',
          userId: resetRequest.userId
        });
        return res.status(401).json({ error: 'Token já foi utilizado' });
      }

      // Atualizar senha
      const hashedPassword = await hash.hashPassword(password);
      await UserRepository.update(resetRequest.userId, {
        password: hashedPassword,
        failedAttempts: 0,
        lockUntil: null
      });

      // Marcar token como usado
      await PasswordResetRepository.markAsUsed(resetRequest.id);

      logger.info({
        action: 'password_reset_success',
        userId: resetRequest.userId
      });

      return res.status(200).json({
        message: 'Senha redefinida com sucesso'
      });
    } catch (error) {
      logger.error({
        action: 'reset_password_error',
        token: req.params?.token?.substring(0, 10),
        error: error.message
      });
      return res.status(500).json({ error: 'Erro ao redefinir senha' });
    }
  }

  /**
   * GET /api/auth/reset-password/:token/validate
   * Validar se token está válido
   */
  async validateResetToken(req, res) {
    try {
      const { token } = req.params;

      const resetRequest = await PasswordResetRepository.findByToken(token);
      if (!resetRequest) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      if (resetRequest.expiresAt < new Date()) {
        return res.status(401).json({ error: 'Token expirado' });
      }

      if (resetRequest.usedAt) {
        return res.status(401).json({ error: 'Token já foi utilizado' });
      }

      return res.status(200).json({
        message: 'Token válido',
        expiresAt: resetRequest.expiresAt
      });
    } catch (error) {
      logger.error({
        action: 'validate_reset_token_error',
        error: error.message
      });
      return res.status(500).json({ error: 'Erro ao validar token' });
    }
  }
}

module.exports = new PasswordResetController();
