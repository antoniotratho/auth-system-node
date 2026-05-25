const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const AuthController = require('../controllers/AuthController');
const authMiddleware = require('../../../shared/middlewares/authMiddleware');

// ✅ Rate limit específico para login - MAIS RESTRITIVO
// 5 tentativas por minuto
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 5,
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
  message: {
    error: 'Muitas tentativas de registro. Tente novamente em 15 minutos.'
  }
});

// Public routes
router.post('/register', registerLimiter, AuthController.register);
router.post('/login', loginLimiter, AuthController.login);

// Protected routes
router.post('/logout', authMiddleware, AuthController.logout);

// Health check
router.get('/ping', (req, res) => {
  res.json({ message: 'Auth module funcionando 🚀' });
});

module.exports = router;
