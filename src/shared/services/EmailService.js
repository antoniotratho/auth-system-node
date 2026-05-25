const nodemailer = require('nodemailer');
const logger = require('../logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  /**
   * Envia email de recuperação de senha
   * @param {string} email - Email do usuário
   * @param {string} resetToken - Token de reset
   * @param {string} resetUrl - URL para resetar senha
   */
  async sendPasswordResetEmail(email, resetToken, resetUrl) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: email,
        subject: '🔐 Recuperação de Senha - Auth System',
        html: `
          <h2>Recuperação de Senha</h2>
          <p>Você solicitou uma recuperação de senha. Clique no link abaixo para continuar:</p>
          <p><a href="${resetUrl}?token=${resetToken}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Recuperar Senha</a></p>
          <p><strong>Importante:</strong> Este link expira em 15 minutos.</p>
          <p>Se você não solicitou essa recuperação, ignore este email.</p>
          <hr>
          <p><small>Auth System - ${new Date().getFullYear()}</small></p>
        `
      };

      await this.transporter.sendMail(mailOptions);

      logger.info({
        action: 'password_reset_email_sent',
        email: email,
        timestamp: new Date()
      });

      return true;
    } catch (error) {
      logger.error({
        action: 'password_reset_email_failed',
        email: email,
        error: error.message
      });
      throw new Error('Erro ao enviar email de recuperação');
    }
  }

  /**
   * Envia email de confirmação 2FA
   * @param {string} email - Email do usuário
   * @param {string} qrCodeUrl - URL da imagem QR Code
   */
  async send2FASetupEmail(email, qrCodeUrl) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: email,
        subject: '🔐 Ative Autenticação de Dois Fatores - Auth System',
        html: `
          <h2>Autenticação de Dois Fatores</h2>
          <p>Você iniciou o processo de ativação de 2FA. Escaneie o código QR abaixo com seu aplicativo authenticator:</p>
          <p style="text-align: center;">
            <img src="${qrCodeUrl}" alt="QR Code" style="width: 200px; height: 200px;">
          </p>
          <p><strong>Aplicativos recomendados:</strong> Google Authenticator, Microsoft Authenticator, Authy</p>
          <hr>
          <p><small>Auth System - ${new Date().getFullYear()}</small></p>
        `
      };

      await this.transporter.sendMail(mailOptions);

      logger.info({
        action: '2fa_setup_email_sent',
        email: email
      });

      return true;
    } catch (error) {
      logger.error({
        action: '2fa_setup_email_failed',
        email: email,
        error: error.message
      });
      throw new Error('Erro ao enviar email de 2FA');
    }
  }

  /**
   * Envia notificação de exclusão de conta
   * @param {string} email - Email do usuário
   * @param {string} confirmUrl - URL de confirmação
   */
  async sendAccountDeleteEmail(email, confirmUrl, token) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: email,
        subject: '⚠️ Confirmação de Exclusão de Conta - Auth System',
        html: `
          <h2>Exclusão de Conta</h2>
          <p>Você solicitou a exclusão de sua conta. Clique no link abaixo para confirmar (válido por 15 minutos):</p>
          <p><a href="${confirmUrl}?token=${token}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Confirmar Exclusão</a></p>
          <p><strong>Atenção:</strong> Esta ação é permanente e não pode ser desfeita.</p>
          <hr>
          <p><small>Auth System - ${new Date().getFullYear()}</small></p>
        `
      };

      await this.transporter.sendMail(mailOptions);

      logger.info({
        action: 'account_delete_email_sent',
        email: email
      });

      return true;
    } catch (error) {
      logger.error({
        action: 'account_delete_email_failed',
        email: email,
        error: error.message
      });
      throw new Error('Erro ao enviar email de exclusão');
    }
  }
}

module.exports = new EmailService();
