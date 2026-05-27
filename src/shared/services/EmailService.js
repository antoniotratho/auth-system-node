const nodemailer = require('nodemailer');
const logger = require('../logger');

class EmailService {
  constructor() {
    this.transporter = null;
  }

  getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    return this.transporter;
  }

  async sendPasswordResetEmail(email, resetToken, resetUrl) {
    try {
      const transporter = this.getTransporter();
      if (!transporter) {
        logger.warn({
          action: 'password_reset_email_skipped',
          email,
          reason: 'smtp_not_configured'
        });
        return false;
      }

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Recuperacao de Senha - Auth System',
        html: `
          <h2>Recuperacao de Senha</h2>
          <p>Voce solicitou uma recuperacao de senha. Clique no link abaixo para continuar:</p>
          <p><a href="${resetUrl}?token=${resetToken}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Recuperar Senha</a></p>
          <p><strong>Importante:</strong> Este link expira em 15 minutos.</p>
          <p>Se voce nao solicitou essa recuperacao, ignore este email.</p>
          <hr>
          <p><small>Auth System - ${new Date().getFullYear()}</small></p>
        `
      });

      logger.info({
        action: 'password_reset_email_sent',
        email,
        timestamp: new Date()
      });

      return true;
    } catch (error) {
      logger.error({
        action: 'password_reset_email_failed',
        email,
        error: error.message
      });
      return false;
    }
  }

  async sendTestEmail(email) {
    const transporter = this.getTransporter();
    if (!transporter) {
      throw new Error('SMTP nao configurado');
    }

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Teste SMTP - Auth System',
      html: `
        <h2>Teste SMTP</h2>
        <p>Se voce recebeu este email, a configuracao SMTP esta funcionando.</p>
        <p><strong>Host:</strong> ${process.env.SMTP_HOST}</p>
        <p><strong>Usuario:</strong> ${process.env.SMTP_USER}</p>
        <p><small>Auth System - ${new Date().toISOString()}</small></p>
      `
    });

    return {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response
    };
  }

  async send2FASetupEmail(email, qrCodeUrl) {
    try {
      const transporter = this.getTransporter();
      if (!transporter) {
        throw new Error('SMTP nao configurado');
      }

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Ative Autenticacao de Dois Fatores - Auth System',
        html: `
          <h2>Autenticacao de Dois Fatores</h2>
          <p>Voce iniciou o processo de ativacao de 2FA. Escaneie o codigo QR abaixo com seu aplicativo authenticator:</p>
          <p style="text-align: center;">
            <img src="${qrCodeUrl}" alt="QR Code" style="width: 200px; height: 200px;">
          </p>
          <p><strong>Aplicativos recomendados:</strong> Google Authenticator, Microsoft Authenticator, Authy</p>
          <hr>
          <p><small>Auth System - ${new Date().getFullYear()}</small></p>
        `
      });

      logger.info({
        action: '2fa_setup_email_sent',
        email
      });

      return true;
    } catch (error) {
      logger.error({
        action: '2fa_setup_email_failed',
        email,
        error: error.message
      });
      throw new Error('Erro ao enviar email de 2FA');
    }
  }

  async sendAccountDeleteEmail(email, confirmUrl, token) {
    try {
      const transporter = this.getTransporter();
      if (!transporter) {
        throw new Error('SMTP nao configurado');
      }

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Confirmacao de Exclusao de Conta - Auth System',
        html: `
          <h2>Exclusao de Conta</h2>
          <p>Voce solicitou a exclusao de sua conta. Clique no link abaixo para confirmar. O link e valido por 15 minutos:</p>
          <p><a href="${confirmUrl}?token=${token}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Confirmar Exclusao</a></p>
          <p><strong>Atencao:</strong> Esta acao e permanente e nao pode ser desfeita.</p>
          <hr>
          <p><small>Auth System - ${new Date().getFullYear()}</small></p>
        `
      });

      logger.info({
        action: 'account_delete_email_sent',
        email
      });

      return true;
    } catch (error) {
      logger.error({
        action: 'account_delete_email_failed',
        email,
        error: error.message
      });
      throw new Error('Erro ao enviar email de exclusao');
    }
  }
}

module.exports = new EmailService();
