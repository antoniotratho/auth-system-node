const nodemailer = require('nodemailer');
const logger = require('../logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.brand = {
      name: 'Condo Transparente',
      primary: '#ff7059',
      primaryDark: '#e84f38',
      background: '#fffaf5',
      text: '#42251f',
      muted: '#8b6259',
      border: '#eadbd4'
    };
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

  getFrontendUrl() {
    return (process.env.FRONTEND_URL || 'http://localhost:8081').replace(/\/$/, '');
  }

  getFromAddress() {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    return `"${this.brand.name}" <${from}>`;
  }

  escapeHtml(value = '') {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  buildButton(label, href, variant = 'primary') {
    const background = variant === 'danger' ? '#dc2626' : this.brand.primary;
    return `
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
        <tr>
          <td style="border-radius: 8px; background: ${background};">
            <a href="${this.escapeHtml(href)}" style="display: inline-block; padding: 13px 22px; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 8px;">
              ${this.escapeHtml(label)}
            </a>
          </td>
        </tr>
      </table>
    `;
  }

  buildInfoList(items = []) {
    if (!items.length) return '';

    const rows = items.map((item) => `
      <tr>
        <td style="padding: 10px 0; color: ${this.brand.muted}; font-size: 13px; border-bottom: 1px solid ${this.brand.border};">${this.escapeHtml(item.label)}</td>
        <td style="padding: 10px 0; color: ${this.brand.text}; font-size: 13px; font-weight: 700; text-align: right; border-bottom: 1px solid ${this.brand.border};">${this.escapeHtml(item.value)}</td>
      </tr>
    `).join('');

    return `
      <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%; margin-top: 18px;">
        ${rows}
      </table>
    `;
  }

  buildEmail({ preheader, title, intro, children = '', button, note, tone = 'default' }) {
    const frontendUrl = this.getFrontendUrl();
    const logoUrl = `${frontendUrl}/logo.png`;
    const year = new Date().getFullYear();
    const accent = tone === 'danger' ? '#dc2626' : this.brand.primary;

    return `
      <!doctype html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${this.escapeHtml(title)}</title>
      </head>
      <body style="margin: 0; padding: 0; background: ${this.brand.background}; font-family: Arial, Helvetica, sans-serif; color: ${this.brand.text};">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
          ${this.escapeHtml(preheader || intro || title)}
        </div>
        <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%; background: ${this.brand.background}; padding: 32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 620px;">
                <tr>
                  <td style="padding: 0 0 18px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%;">
                      <tr>
                        <td style="vertical-align: middle;">
                          <img src="${logoUrl}" width="64" height="64" alt="${this.brand.name}" style="display: block; border: 0; border-radius: 12px;">
                        </td>
                        <td style="vertical-align: middle; padding-left: 14px;">
                          <div style="font-size: 20px; line-height: 1.2; font-weight: 800; color: ${this.brand.text};">${this.brand.name}</div>
                          <div style="font-size: 13px; color: ${this.brand.muted}; margin-top: 3px;">Portal do condomínio</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background: #ffffff; border: 1px solid ${this.brand.border}; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 28px rgba(66, 37, 31, 0.08);">
                    <div style="height: 5px; background: ${accent};"></div>
                    <div style="padding: 32px;">
                      <h1 style="margin: 0 0 12px 0; font-size: 26px; line-height: 1.2; color: ${this.brand.text};">${this.escapeHtml(title)}</h1>
                      <p style="margin: 0 0 18px 0; font-size: 15px; line-height: 1.7; color: ${this.brand.muted};">${this.escapeHtml(intro)}</p>
                      ${children}
                      ${button || ''}
                      ${note ? `
                        <div style="margin-top: 22px; padding: 14px 16px; background: #fff4ee; border: 1px solid ${this.brand.border}; border-radius: 8px; color: ${this.brand.muted}; font-size: 13px; line-height: 1.6;">
                          ${this.escapeHtml(note)}
                        </div>
                      ` : ''}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 18px 4px 0 4px; color: ${this.brand.muted}; font-size: 12px; line-height: 1.6; text-align: center;">
                    © ${year} ${this.brand.name}. Este email foi enviado automaticamente pelo portal.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  async sendBrandedEmail({ to, subject, html, text, logAction }) {
    const transporter = this.getTransporter();
    if (!transporter) {
      logger.warn({
        action: `${logAction}_skipped`,
        email: to,
        reason: 'smtp_not_configured'
      });
      return false;
    }

    await transporter.sendMail({
      from: this.getFromAddress(),
      to,
      subject,
      html,
      text
    });

    logger.info({
      action: `${logAction}_sent`,
      email: to,
      timestamp: new Date()
    });

    return true;
  }

  async sendWelcomeEmail(email, role = 'morador') {
    try {
      const frontendUrl = this.getFrontendUrl();
      const dashboardPath = role === 'sindico' ? '/sindico' : '/morador';
      const dashboardUrl = `${frontendUrl}${dashboardPath}`;
      const html = this.buildEmail({
        preheader: 'Sua conta no Condo Transparente foi criada com sucesso.',
        title: 'Bem-vindo ao Condo Transparente',
        intro: 'Sua conta foi criada com sucesso. Agora você pode acessar o portal, revisar seus dados, configurar segurança e acompanhar as informações do condomínio.',
        children: this.buildInfoList([
          { label: 'Perfil', value: role === 'sindico' ? 'Síndico' : 'Morador' },
          { label: 'Próximo passo', value: 'Aceitar os termos LGPD no primeiro acesso' }
        ]),
        button: this.buildButton('Acessar portal', dashboardUrl),
        note: 'Por segurança, recomendamos ativar a autenticação de dois fatores depois do primeiro acesso.'
      });

      return await this.sendBrandedEmail({
        to: email,
        subject: 'Bem-vindo ao Condo Transparente',
        html,
        text: `Bem-vindo ao Condo Transparente. Acesse: ${dashboardUrl}`,
        logAction: 'welcome_email'
      });
    } catch (error) {
      logger.error({
        action: 'welcome_email_failed',
        email,
        error: error.message
      });
      return false;
    }
  }

  async sendPasswordResetEmail(email, resetToken, resetUrl) {
    try {
      const resetLink = `${resetUrl}?token=${resetToken}`;
      const html = this.buildEmail({
        preheader: 'Use o link seguro para redefinir sua senha.',
        title: 'Redefinição de senha',
        intro: 'Recebemos uma solicitação para redefinir a senha da sua conta. Use o botão abaixo para criar uma nova senha.',
        button: this.buildButton('Redefinir senha', resetLink),
        note: 'Este link expira em 15 minutos. Se você não solicitou a redefinição, ignore este email.'
      });

      return await this.sendBrandedEmail({
        to: email,
        subject: 'Redefinição de senha - Condo Transparente',
        html,
        text: `Redefina sua senha pelo link: ${resetLink}. O link expira em 15 minutos.`,
        logAction: 'password_reset_email'
      });
    } catch (error) {
      logger.error({
        action: 'password_reset_email_failed',
        email,
        error: error.message
      });
      return false;
    }
  }

  async sendPasswordChangedEmail(email) {
    try {
      const loginUrl = `${this.getFrontendUrl()}/login`;
      const html = this.buildEmail({
        preheader: 'Sua senha foi redefinida com sucesso.',
        title: 'Senha atualizada',
        intro: 'A senha da sua conta foi redefinida com sucesso. Você já pode acessar o portal com a nova senha.',
        button: this.buildButton('Entrar no portal', loginUrl),
        note: 'Se você não realizou esta alteração, solicite uma nova recuperação de senha imediatamente.'
      });

      return await this.sendBrandedEmail({
        to: email,
        subject: 'Senha atualizada - Condo Transparente',
        html,
        text: `Sua senha foi atualizada. Acesse: ${loginUrl}`,
        logAction: 'password_changed_email'
      });
    } catch (error) {
      logger.error({
        action: 'password_changed_email_failed',
        email,
        error: error.message
      });
      return false;
    }
  }

  async sendTestEmail(email) {
    const html = this.buildEmail({
      preheader: 'Teste de configuração SMTP.',
      title: 'Teste de email',
      intro: 'Se você recebeu este email, a configuração SMTP está funcionando corretamente.',
      children: this.buildInfoList([
        { label: 'Servidor SMTP', value: process.env.SMTP_HOST || 'Não configurado' },
        { label: 'Usuário SMTP', value: process.env.SMTP_USER || 'Não configurado' }
      ])
    });

    const transporter = this.getTransporter();
    if (!transporter) {
      throw new Error('SMTP nao configurado');
    }

    const info = await transporter.sendMail({
      from: this.getFromAddress(),
      to: email,
      subject: 'Teste SMTP - Condo Transparente',
      html,
      text: 'Teste SMTP do Condo Transparente.'
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
      const html = this.buildEmail({
        preheader: 'Finalize a ativação da autenticação de dois fatores.',
        title: 'Ative a autenticação em dois fatores',
        intro: 'Você iniciou a configuração de 2FA. Escaneie o QR Code abaixo usando um aplicativo autenticador.',
        children: `
          <div style="text-align: center; margin: 24px 0;">
            <img src="${this.escapeHtml(qrCodeUrl)}" alt="QR Code 2FA" style="width: 210px; height: 210px; border: 1px solid ${this.brand.border}; border-radius: 12px; padding: 10px; background: #ffffff;">
          </div>
          ${this.buildInfoList([
            { label: 'Aplicativos recomendados', value: 'Google, Microsoft Authenticator ou Authy' },
            { label: 'Código', value: '6 dígitos a cada 30 segundos' }
          ])}
        `,
        note: 'Nunca compartilhe seus códigos de autenticação com outras pessoas.'
      });

      return await this.sendBrandedEmail({
        to: email,
        subject: 'Ative o 2FA - Condo Transparente',
        html,
        text: 'Finalize a configuração de autenticação em dois fatores no Condo Transparente.',
        logAction: '2fa_setup_email'
      });
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
      const deleteLink = `${confirmUrl}?token=${token}`;
      const html = this.buildEmail({
        preheader: 'Confirme a solicitação de exclusão da sua conta.',
        title: 'Exclusão de conta',
        intro: 'Recebemos uma solicitação para excluir sua conta. Esta ação é permanente e remove seus dados pessoais do sistema.',
        button: this.buildButton('Confirmar exclusão', deleteLink, 'danger'),
        note: 'O link é válido por 15 minutos. Se você não solicitou a exclusão, ignore este email e mantenha sua conta segura.',
        tone: 'danger'
      });

      return await this.sendBrandedEmail({
        to: email,
        subject: 'Confirmação de exclusão de conta - Condo Transparente',
        html,
        text: `Confirme a exclusão da conta pelo link: ${deleteLink}`,
        logAction: 'account_delete_email'
      });
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
