const express = require('express');
const TwoFactorController = require('../controllers/TwoFactorController');
const PasswordResetController = require('../controllers/PasswordResetController');
const authMiddleware = require('../../../shared/middlewares/authMiddleware');
const rateLimiter = require('../../../shared/middlewares/rateLimitMiddleware');

const router = express.Router();

// ========== 2FA Routes ==========

/**
 * POST /api/auth/2fa/setup
 * Inicia setup de 2FA - retorna QR code
 * Requer token válido (JWT)
 */
router.post('/2fa/setup', authMiddleware, TwoFactorController.setupTwoFactor);

/**
 * POST /api/auth/2fa/verify-setup
 * Verifica token TOTP e ativa 2FA
 * Requer token válido
 */
router.post('/2fa/verify-setup', authMiddleware, TwoFactorController.verifyTwoFactorSetup);

/**
 * POST /api/auth/login/2fa
 * Valida token TOTP após login primário
 * Requer tempToken (temporary JWT)
 */
router.post('/login/2fa', authMiddleware, TwoFactorController.validateTwoFactor);

/**
 * POST /api/auth/2fa/disable
 * Desativa 2FA
 * Requer token válido + senha
 */
router.post('/2fa/disable', authMiddleware, TwoFactorController.disableTwoFactor);

// ========== Password Recovery Routes ==========

/**
 * POST /api/auth/forgot-password
 * Solicitação de recuperação de senha
 * Rate limit: 3 requests per 15 minutes
 */
router.post('/forgot-password', rateLimiter({ windowMs: 15 * 60 * 1000, max: 3 }), PasswordResetController.forgotPassword);

/**
 * POST /api/auth/reset-password/:token
 * Redefinir senha com token
 * Rate limit: 5 requests per 15 minutes
 */
router.post('/reset-password/:token', rateLimiter({ windowMs: 15 * 60 * 1000, max: 5 }), PasswordResetController.resetPassword);

/**
 * GET /api/auth/reset-password/:token/validate
 * Validar se token está válido (sem rate limit)
 */
router.get('/reset-password/:token/validate', PasswordResetController.validateResetToken);

module.exports = router;
