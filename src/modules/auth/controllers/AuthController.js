const AuthService = require('../services/AuthService');
const logger = require('../../../shared/logger');

class AuthController {
  /**
   * Registra novo usuário
   */
  async register(req, res) {
    try {
      const { email, password } = req.body;

      // Validar entrada
      if (!email || !password) {
        return res.status(400).json({
          error: 'Email e senha são obrigatórios'
        });
      }

      const user = await AuthService.register(email, password);
      res.status(201).json(user);
    } catch (error) {
      logger.warn({
        action: 'register_controller_error',
        error: error.message,
        ip: req.ip
      });
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Login com proteção contra força bruta
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validar entrada
      if (!email || !password) {
        return res.status(400).json({
          error: 'Email e senha são obrigatórios'
        });
      }

      const result = await AuthService.login(email, password, req.ip);
      res.json(result);
    } catch (error) {
      logger.warn({
        action: 'login_controller_error',
        error: error.message,
        ip: req.ip
      });
      res.status(401).json({ error: error.message });
    }
  }

  /**
   * Logout - invalida sessão
   */
  async logout(req, res) {
    try {
      // Em produção, aqui você faria invalidação do token em Redis
      // Para agora, apenas retornar sucesso
      logger.info({
        action: 'user_logout',
        userId: req.userId,
        ip: req.ip
      });

      res.json({
        message: 'Logout realizado com sucesso'
      });
    } catch (error) {
      logger.error({
        action: 'logout_error',
        error: error.message
      });
      res.status(500).json({ error: 'Erro ao fazer logout' });
    }
  }
}

module.exports = new AuthController;
