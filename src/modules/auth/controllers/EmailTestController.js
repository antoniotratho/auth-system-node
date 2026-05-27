const emailService = require('../../../shared/services/EmailService');
const logger = require('../../../shared/logger');

class EmailTestController {
  async sendTest(req, res) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: 'Rota nao encontrada' });
    }

    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email obrigatorio' });
      }

      const result = await emailService.sendTestEmail(email);

      logger.info({
        action: 'smtp_test_success',
        email,
        result
      });

      return res.status(200).json({
        message: 'Email de teste enviado',
        smtp: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          user: process.env.SMTP_USER,
          from: process.env.SMTP_FROM
        },
        result
      });
    } catch (error) {
      logger.error({
        action: 'smtp_test_failed',
        email: req.body?.email,
        error: error.message
      });

      return res.status(500).json({
        error: 'Erro ao enviar email de teste',
        details: error.message,
        smtp: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          user: process.env.SMTP_USER,
          from: process.env.SMTP_FROM
        }
      });
    }
  }
}

module.exports = new EmailTestController();
