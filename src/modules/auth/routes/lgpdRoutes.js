const express = require('express');
const LGPDController = require('../controllers/LGPDController');
const authMiddleware = require('../../../shared/middlewares/authMiddleware');

const router = express.Router();

/**
 * GET /api/auth/my-data
 * Retorna todos os dados do usuário
 * Requer token válido
 */
router.get('/my-data', authMiddleware, LGPDController.getMyData);

/**
 * POST /api/auth/export-data
 * Gera link de download dos dados
 * Requer token válido
 */
router.post('/export-data', authMiddleware, LGPDController.exportData);

/**
 * POST /api/auth/delete-account
 * Inicia processo de exclusão de conta
 * Requer token válido + senha
 */
router.post('/delete-account', authMiddleware, LGPDController.requestAccountDeletion);

/**
 * POST /api/auth/consent
 * Registra consentimento do usuário
 * Requer token válido
 */
router.post('/consent', authMiddleware, LGPDController.giveConsent);

module.exports = router;
