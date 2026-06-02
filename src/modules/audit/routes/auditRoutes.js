const express = require('express');
const router = express.Router();
const logger = require('../../../shared/logger');
const logSecurityManager = logger.logSecurityManager;

/**
 * Verificar integridade de um arquivo de log específico
 * GET /audit/logs/verify/:logFile
 */
router.get('/logs/verify/:logFile', (req, res) => {
  try {
    const { logFile } = req.params;

    // Validar nome do arquivo (prevenir path traversal)
    if (!['error.log', 'security.log', 'app.log'].includes(logFile)) {
      return res.status(400).json({
        error: 'Invalid log file',
        validFiles: ['error.log', 'security.log', 'app.log']
      });
    }

    const result = logSecurityManager.verifyLogIntegrity(logFile);

    if (!result.valid) {
      return res.status(400).json({
        ...result,
        severity: 'HIGH',
        message: 'Log integrity check failed'
      });
    }

    return res.json({
      ...result,
      status: 'OK',
      message: 'Log file integrity verified'
    });
  } catch (error) {
    logger.error({
      action: 'audit_verify_log_error',
      error: error.message,
      userId: req.userId
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Verificar integridade de TODOS os logs
 * GET /audit/logs/verify-all
 */
router.get('/logs/verify-all', (req, res) => {
  try {
    const result = logSecurityManager.verifyAllLogIntegrity();

    logger.info({
      action: 'audit_verify_all_logs',
      allValid: result.allValid,
      userId: req.userId
    });

    const statusCode = result.allValid ? 200 : 400;
    return res.status(statusCode).json({
      ...result,
      status: result.allValid ? 'OK' : 'COMPROMISED',
      message: result.allValid
        ? 'All logs verified successfully'
        : 'Some logs failed integrity check'
    });
  } catch (error) {
    logger.error({
      action: 'audit_verify_all_logs_error',
      error: error.message,
      userId: req.userId
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Obter relatório completo de segurança
 * GET /audit/security-report
 */
router.get('/security-report', (req, res) => {
  try {
    const report = logSecurityManager.generateSecurityReport();

    logger.info({
      action: 'audit_security_report_generated',
      allValid: report.summary.allValid,
      userId: req.userId
    });

    return res.json({
      ...report,
      message: report.summary.allValid
        ? 'System logs are secure'
        : 'WARNING: Security issues detected'
    });
  } catch (error) {
    logger.error({
      action: 'audit_security_report_error',
      error: error.message,
      userId: req.userId
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Obter histórico de auditoria de acesso
 * GET /audit/access-history?limit=50
 */
router.get('/access-history', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const history = logSecurityManager.getAccessAuditHistory(limit);

    logger.info({
      action: 'audit_access_history_retrieved',
      limit,
      recordsReturned: history.length,
      userId: req.userId
    });

    return res.json({
      timestamp: new Date().toISOString(),
      limit,
      records: history,
      totalRecords: history.length
    });
  } catch (error) {
    logger.error({
      action: 'audit_access_history_error',
      error: error.message,
      userId: req.userId
    });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
