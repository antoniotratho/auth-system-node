const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../../config/env');
const logger = require('../logger');

/**
 * Middleware de autenticação via JWT
 * Valida o token e injeta userId no request
 */
const authMiddleware = (req, res, next) => {
  try {
    // Extrair token do header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      logger.warn({
        action: 'auth_middleware_no_token',
        url: req.url,
        method: req.method,
        ip: req.ip
      });
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    // Verificar formato "Bearer [token]"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      logger.warn({
        action: 'auth_middleware_invalid_format',
        ip: req.ip
      });
      return res.status(401).json({ error: 'Formato de token inválido' });
    }

    const token = parts[1];

    // Verificar e decodificar JWT
    const decoded = jwt.verify(token, jwtSecret);

    // Verificar se é token temporário (após autenticação primária, aguardando 2FA)
    if (decoded.temporary) {
      logger.warn({
        action: 'auth_middleware_temporary_token',
        userId: decoded.userId,
        ip: req.ip
      });
      return res.status(401).json({ 
        error: 'Token temporário - complete a autenticação de dois fatores' 
      });
    }

    // Injetar userId no request para uso posterior
    req.userId = decoded.userId;
    req.user = decoded;

    logger.debug({
      action: 'auth_middleware_success',
      userId: decoded.userId
    });

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.warn({
        action: 'auth_middleware_token_expired',
        ip: req.ip,
        expiresAt: error.expiredAt
      });
      return res.status(401).json({ 
        error: 'Token expirado. Faça login novamente.' 
      });
    }

    if (error.name === 'JsonWebTokenError') {
      logger.warn({
        action: 'auth_middleware_invalid_token',
        ip: req.ip,
        error: error.message
      });
      return res.status(401).json({ 
        error: 'Token inválido' 
      });
    }

    logger.error({
      action: 'auth_middleware_error',
      error: error.message,
      ip: req.ip
    });

    res.status(401).json({ error: 'Erro ao validar token' });
  }
};

module.exports = authMiddleware;
