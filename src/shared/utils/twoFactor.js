const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const logger = require('../logger');

/**
 * Serviço de Autenticação de Dois Fatores (2FA) - TOTP
 * Usa Time-based One-Time Password para máxima segurança
 */
class TwoFactorService {
  /**
   * Gera secret TOTP para o usuário
   * @param {string} email - Email do usuário
   * @returns {object} Secret e URL TOTP
   */
  generateSecret(email) {
    try {
      const secret = speakeasy.generateSecret({
        name: `AuthSystem (${email})`,
        issuer: 'AuthSystem',
        length: 32,
        symbols: true
      });

      logger.info({
        action: 'twofa_secret_generated',
        email: email,
        algorithm: 'TOTP'
      });

      return {
        secret: secret.base32,
        otpauth_url: secret.otpauth_url,
        backup_codes: this.generateBackupCodes()
      };
    } catch (error) {
      logger.error({
        action: 'twofa_secret_generation_failed',
        error: error.message
      });
      throw new Error('Erro ao gerar secret 2FA');
    }
  }

  /**
   * Gera códigos de backup em caso de perda do app authenticator
   * @returns {array} Array com 10 códigos de backup
   */
  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
  }

  /**
   * Gera QR Code para escanear
   * @param {string} otpauth_url - URL otpauth
   * @returns {Promise<string>} Data URL do QR Code
   */
  async generateQRCode(otpauth_url) {
    try {
      const qrCode = await QRCode.toDataURL(otpauth_url, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      logger.debug({
        action: 'twofa_qrcode_generated'
      });

      return qrCode;
    } catch (error) {
      logger.error({
        action: 'twofa_qrcode_generation_failed',
        error: error.message
      });
      throw new Error('Erro ao gerar QR Code');
    }
  }

  /**
   * Verifica token TOTP do usuário
   * @param {string} secret - Secret do usuário (base32)
   * @param {string} token - Token de 6 dígitos
   * @returns {boolean} Token válido
   */
  verifyToken(secret, token) {
    try {
      if (!token || !/^\d{6}$/.test(token)) {
        logger.warn({
          action: 'twofa_verify_failed',
          reason: 'invalid_token_format'
        });
        return false;
      }

      const isValid = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2 // Permite 2 janelas de tempo (60 segundos + 30s antes/depois)
      });

      if (isValid) {
        logger.info({
          action: 'twofa_verified'
        });
      } else {
        logger.warn({
          action: 'twofa_verify_failed',
          reason: 'invalid_token'
        });
      }

      return isValid;
    } catch (error) {
      logger.error({
        action: 'twofa_verify_error',
        error: error.message
      });
      return false;
    }
  }

  /**
   * Gera token TOTP para validação (usado em testes)
   * @param {string} secret - Secret do usuário
   * @returns {string} Token de 6 dígitos
   */
  generateToken(secret) {
    try {
      const token = speakeasy.totp({
        secret: secret,
        encoding: 'base32'
      });
      return token;
    } catch (error) {
      logger.error({
        action: 'twofa_token_generation_failed',
        error: error.message
      });
      throw new Error('Erro ao gerar token TOTP');
    }
  }
}

module.exports = new TwoFactorService();
