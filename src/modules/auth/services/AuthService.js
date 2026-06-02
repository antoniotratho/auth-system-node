const hash = require('../../../shared/utils/hash');
const logger = require("../../../shared/logger");
const UserRepository = require("../repositories/UserRepository");
const jwt = require("../../../shared/utils/jwt");
const emailService = require("../../../shared/services/EmailService");

class AuthService {

  /**
   * Registra novo usuário
   * @param {string} email - Email do usuário
   * @param {string} password - Senha em texto plano
   * @returns {Promise} Dados do usuário criado
   */
  async register(email, password, role = 'morador') {
    try {
      const allowedRoles = ['sindico', 'morador'];
      if (!allowedRoles.includes(role)) {
        throw new Error('Role inválida. Deve ser "sindico" ou "morador"');
      }

      // Validar email único
      const userExists = await UserRepository.findByEmail(email);
      if (userExists) {
        logger.warn({
          action: 'register_failed_email_exists',
          email: email
        });
        throw new Error('Email já registrado');
      }

      // Validar força da senha
      if (!this.isStrongPassword(password)) {
        throw new Error('Senha fraca. Mínimo 8 caracteres, incluindo maiúscula, número e caractere especial');
      }

      // Hash da senha com bcrypt (10 rounds configurado em hash.js)
      const hashedPassword = await hash.hashPassword(password);

      // Criar usuário
      const user = await UserRepository.create({
        email,
        password: hashedPassword,
        role,
        failedAttempts: 0,
        twoFactorEnabled: false
      });

      logger.info({
        action: 'user_registered',
        email: email,
        userId: user.id
      });

      emailService.sendWelcomeEmail(user.email, user.role).catch((emailError) => {
        logger.warn({
          action: 'welcome_email_async_failed',
          email: user.email,
          error: emailError.message
        });
      });

      return {
        message: 'Usuário criado com sucesso',
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt
        }
      };
    } catch (error) {
      logger.error({
        action: 'register_error',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Login com proteção contra força bruta
   * @param {string} email - Email do usuário
   * @param {string} password - Senha em texto plano
   * @param {string} ip - IP do cliente
   * @returns {Promise} Token JWT ou requer 2FA
   */
  async login(email, password, ip = 'unknown') {
    try {
      // Buscar usuário
      const user = await UserRepository.findByEmail(email);
      if (!user) {
        logger.warn({
          action: 'login_failed_user_not_found',
          email: email,
          ip: ip
        });
        // Retornar erro genérico por segurança (não revelar se email existe)
        throw new Error('Credenciais inválidas');
      }

      // Verificar se conta está bloqueada por força bruta
      if (user.lockUntil && user.lockUntil > new Date()) {
        const minutosRestantes = Math.ceil((user.lockUntil - new Date()) / 60000);
        logger.warn({
          action: 'login_failed_account_locked',
          email: email,
          ip: ip,
          minutesRemaining: minutosRestantes,
          failedAttempts: user.failedAttempts
        });
        throw new Error(`Conta bloqueada. Tente novamente em ${minutosRestantes} minutos.`);
      }

      // Validar senha
      const isPasswordValid = await hash.comparePassword(password, user.password);
      if (!isPasswordValid) {
        // Incrementar tentativas falhadas
        await UserRepository.incrementFailedAttempts(user.id);

        logger.warn({
          action: 'login_failed_invalid_password',
          email: email,
          ip: ip,
          failedAttempts: user.failedAttempts + 1
        });

        throw new Error('Credenciais inválidas');
      }

      // Login bem-sucedido - resetar tentativas falhadas
      await UserRepository.resetFailedAttempts(user.id);

      logger.info({
        action: 'login_success_primary',
        userId: user.id,
        email: email,
        ip: ip
      });

      // Se 2FA está ativado, retornar token temporário
      if (user.twoFactorEnabled) {
        const tempToken = jwt.generateJWT(
          { userId: user.id, temporary: true, role: user.role },
          '5m'
        );

        return {
          requiresTwoFactor: true,
          tempToken: tempToken,
          role: user.role,
          message: 'Complete a autenticação de dois fatores'
        };
      }

      // Sem 2FA - retornar JWT permanente
      const token = jwt.generateJWT({ userId: user.id, role: user.role }, '1h');

      return {
        message: 'Login realizado com sucesso',
        token: token,
        expiresIn: 3600,
        role: user.role
      };
    } catch (error) {
      logger.error({
        action: 'login_error',
        email: email,
        error: error.message,
        ip: ip
      });
      throw error;
    }
  }

  /**
   * Valida força da senha
   * Mínimo: 8 caracteres, 1 maiúscula, 1 número, 1 caractere especial
   */
  isStrongPassword(password) {
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongRegex.test(password);
  }
}

module.exports = new AuthService;
