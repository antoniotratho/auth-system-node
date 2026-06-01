const { randomUUID } = require('crypto');
const logger = require('../../../shared/logger');
const UserRepository = require('../repositories/UserRepository');
const PasswordResetRepository = require('../repositories/PasswordResetRepository');
const emailService = require('../../../shared/services/EmailService');
const hash = require('../../../shared/utils/hash');

class PasswordResetController {
  async forgotPassword(req, res) {

    
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email obrigatorio' });
      }

      const user = await UserRepository.findByEmail(email);
      if (!user) {
        logger.warn({
          action: 'forgot_password_user_not_found',
          email,
          ip: req.ip
        });
        return res.status(200).json({
          message: 'Se o email existe em nosso sistema, voce recebera um link de recuperacao'
        });
      }

      const resetToken = randomUUID();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await PasswordResetRepository.create({
        userId: user.id,
        token: resetToken,
        expiresAt
      });

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8081'}/reset-password`;

      let emailSent = false;
      try {
        emailSent = await emailService.sendPasswordResetEmail(email, resetToken, resetUrl);
        logger.info({
          action: 'forgot_password_requested',
          email,
          userId: user.id,
          ip: req.ip,
          emailSent
        });
      } catch (emailError) {
        logger.error({
          action: 'password_reset_email_failed',
          email,
          error: emailError.message
        });
      }

      const response = {
        message: 'Se o email existe em nosso sistema, voce recebera um link de recuperacao'
      };

      if (process.env.NODE_ENV !== 'production' && !emailSent) {
        response.emailSent = false;
        response.resetToken = resetToken;
        response.resetUrl = `${resetUrl}?token=${resetToken}`;
      }

      return res.status(200).json(response);
    } catch (error) {
      logger.error({
        action: 'forgot_password_error',
        email: req.body?.email,
        error: error.message
      });
      return res.status(500).json({ error: 'Erro ao processar recuperacao de senha' });
    }
  }

  async resetPassword(req, res) {
    try {
      const { token } = req.params;
      const { password, passwordConfirm } = req.body;

      if (!password || !passwordConfirm) {
        return res.status(400).json({ error: 'Senha e confirmacao sao obrigatorias' });
      }

      if (password !== passwordConfirm) {
        return res.status(400).json({ error: 'Senhas nao coincidem' });
      }

      const AuthService = require('../services/AuthService');
      if (!AuthService.isStrongPassword(password)) {
        return res.status(400).json({
          error: 'Senha fraca. Minimo 8 caracteres, incluindo maiuscula, numero e caractere especial'
        });
      }

      const resetRequest = await PasswordResetRepository.findByToken(token);
      if (!resetRequest) {
        logger.warn({
          action: 'reset_password_token_not_found',
          token: token.substring(0, 10) + '...',
          ip: req.ip
        });
        return res.status(401).json({ error: 'Token inválido' });
      }

      if (resetRequest.expiresAt < new Date()) {
        logger.warn({
          action: 'reset_password_token_expired',
          token: token.substring(0, 10) + '...',
          userId: resetRequest.userId
        });
        return res.status(401).json({ error: 'Token expirado' });
      }

      if (resetRequest.usedAt) {
        logger.warn({
          action: 'reset_password_token_already_used',
          token: token.substring(0, 10) + '...',
          userId: resetRequest.userId
        });
        return res.status(401).json({ error: 'Token ja foi utilizado' });
      }

      const hashedPassword = await hash.hashPassword(password);
      await UserRepository.update(resetRequest.userId, {
        password: hashedPassword,
        failedAttempts: 0,
        lockUntil: null
      });

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
        return res.status(401).json({ error: 'Token ja foi utilizado' });
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
