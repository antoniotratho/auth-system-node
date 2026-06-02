const router = require('express').Router();
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const AuthController = require('../controllers/AuthController');
const TwoFactorController = require('../controllers/TwoFactorController');
const PasswordResetController = require('../controllers/PasswordResetController');
const EmailTestController = require('../controllers/EmailTestController');
const authMiddleware = require('../../../shared/middlewares/authMiddleware');

// ✅ Rate limit específico para login - MAIS RESTRITIVO
// 5 tentativas por minuto
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 5,
  keyGenerator: (req) => req.body?.email || ipKeyGenerator(req.ip),
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 1 minuto.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false // Contar até sucessos
});

// ✅ Rate limit para registro - um pouco menos restritivo
// 3 registros por 15 minutos
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3,
  keyGenerator: (req) => req.body?.email || ipKeyGenerator(req.ip),
  message: {
    error: 'Muitas tentativas de registro. Tente novamente em 15 minutos.'
  }
});

// ✅ Rate limit para recuperação de senha
// 3 tentativas por 15 minutos
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  keyGenerator: (req) => req.body?.email || req.params?.token || ipKeyGenerator(req.ip),
  message: {
    error: 'Muitas tentativas de recuperação. Tente novamente em 15 minutos.'
  }
});

// ========== Authentication Routes ==========
router.post('/register', registerLimiter, AuthController.register);
router.post('/login', loginLimiter, AuthController.login);
router.post('/logout', authMiddleware, AuthController.logout);

// ========== 2FA Routes ==========
router.post('/2fa/setup', authMiddleware, TwoFactorController.setupTwoFactor);
router.post('/2fa/verify-setup', authMiddleware, TwoFactorController.verifyTwoFactorSetup);
router.post('/login/2fa', authMiddleware, TwoFactorController.validateTwoFactor);
router.post('/2fa/disable', authMiddleware, TwoFactorController.disableTwoFactor);

// ========== Password Recovery Routes ==========
router.post('/forgot-password2',  PasswordResetController.forgotPassword);
router.post('/forgot-password', passwordResetLimiter, PasswordResetController.forgotPassword);
router.post('/reset-password/:token', passwordResetLimiter, PasswordResetController.resetPassword);
router.get('/reset-password/:token/validate', PasswordResetController.validateResetToken);
router.post('/test-email', EmailTestController.sendTest);

// ========== LGPD Routes ==========
router.get('/my-data', authMiddleware, require('../controllers/LGPDController').getMyData);
router.post('/export-data', authMiddleware, require('../controllers/LGPDController').exportData);
router.get('/download-data/:token', require('../controllers/LGPDController').downloadData);
router.post('/delete-account', authMiddleware, require('../controllers/LGPDController').requestAccountDeletion);
router.get('/consents', authMiddleware, require('../controllers/LGPDController').listConsents);
router.post('/consent', authMiddleware, require('../controllers/LGPDController').giveConsent);
router.post('/consent/:id/revoke', authMiddleware, require('../controllers/LGPDController').revokeConsent);

// ========== Health Check ==========
router.get('/ping', (req, res) => {
  res.json({ message: 'Auth module funcionando 🚀' });
});

module.exports = router;
