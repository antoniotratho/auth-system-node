const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class LogSecurityManager {
  constructor(logsDir) {
    this.logsDir = logsDir;
    this.checksumFile = path.join(logsDir, '.log-integrity');
    this.accessAuditFile = path.join(logsDir, '.log-access-audit');
    this.initializeChecksumFile();
  }

  /**
   * Inicializa arquivo de checksum se não existir
   */
  initializeChecksumFile() {
    if (!fs.existsSync(this.checksumFile)) {
      fs.writeFileSync(this.checksumFile, JSON.stringify({
        version: '1.0',
        createdAt: new Date().toISOString(),
        logs: {}
      }, null, 2), { mode: 0o600 }); // Modo read/write apenas para o owner
    }
  }

  /**
   * Calcula hash SHA-256 de um arquivo de log
   * @param {string} filePath - Caminho do arquivo
   * @returns {string} Hash em formato hex
   */
  calculateFileHash(filePath) {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return crypto
      .createHash('sha256')
      .update(fileContent)
      .digest('hex');
  }

  /**
   * Calcula hash de uma única linha de log
   * @param {string} logEntry - Entrada de log
   * @returns {string} Hash em formato hex
   */
  calculateEntryHash(logEntry) {
    return crypto
      .createHash('sha256')
      .update(logEntry)
      .digest('hex');
  }

  /**
   * Registra hash de log no arquivo de integridade
   * @param {string} logFile - Nome do arquivo de log
   * @param {string} hash - Hash SHA-256
   * @param {number} lineCount - Número de linhas
   */
  recordLogHash(logFile, hash, lineCount) {
    try {
      const checksumData = JSON.parse(
        fs.readFileSync(this.checksumFile, 'utf-8')
      );

      checksumData.logs[logFile] = {
        hash,
        lineCount,
        timestamp: new Date().toISOString(),
        verify: true // Flag para auditoria
      };

      fs.writeFileSync(
        this.checksumFile,
        JSON.stringify(checksumData, null, 2),
        { mode: 0o600 }
      );
    } catch (error) {
      console.error('Erro ao registrar hash de log:', error.message);
    }
  }

  /**
   * Verifica integridade de um arquivo de log
   * @param {string} logFile - Nome do arquivo
   * @returns {object} Resultado da verificação
   */
  verifyLogIntegrity(logFile) {
    try {
      const filePath = path.join(this.logsDir, logFile);
      const currentHash = this.calculateFileHash(filePath);

      if (!currentHash) {
        return {
          valid: false,
          reason: 'File not found',
          logFile,
          timestamp: new Date().toISOString()
        };
      }

      const checksumData = JSON.parse(
        fs.readFileSync(this.checksumFile, 'utf-8')
      );

      if (!checksumData.logs[logFile]) {
        return {
          valid: false,
          reason: 'No checksum recorded',
          logFile,
          timestamp: new Date().toISOString()
        };
      }

      const recordedHash = checksumData.logs[logFile].hash;
      const isValid = currentHash === recordedHash;

      const result = {
        valid: isValid,
        logFile,
        currentHash,
        recordedHash,
        lastVerified: checksumData.logs[logFile].timestamp,
        timestamp: new Date().toISOString()
      };

      if (!isValid) {
        result.reason = 'HASH MISMATCH - File may have been modified';
        this.logAccessAudit('INTEGRITY_FAILURE', logFile, result);
      } else {
        this.logAccessAudit('INTEGRITY_VERIFIED', logFile, result);
      }

      return result;
    } catch (error) {
      return {
        valid: false,
        reason: error.message,
        logFile,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Verifica integridade de todos os logs
   * @returns {array} Array com resultados de verificação
   */
  verifyAllLogIntegrity() {
    const checksumData = JSON.parse(
      fs.readFileSync(this.checksumFile, 'utf-8')
    );

    const results = [];
    for (const logFile of Object.keys(checksumData.logs)) {
      results.push(this.verifyLogIntegrity(logFile));
    }

    return {
      allValid: results.every(r => r.valid),
      results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Define permissões append-only no arquivo de log
   * @param {string} filePath - Caminho do arquivo
   */
  setAppendOnlyPermissions(filePath) {
    try {
      if (process.platform !== 'win32') {
        // Em Unix/Linux usar chattr +a (append-only)
        const { execSync } = require('child_process');
        try {
          execSync(`chattr +a "${filePath}"`);
        } catch {
          // Se falhar, apenas setar permissões de leitura/escrita
          fs.chmodSync(filePath, 0o600);
        }
      } else {
        // Windows: arquivo read-only para não-owners
        fs.chmodSync(filePath, 0o600);
      }
    } catch (error) {
      console.error('Erro ao setar permissões append-only:', error.message);
    }
  }

  /**
   * Registra acesso/modificação de logs (auditoria)
   * @param {string} action - Ação realizada
   * @param {string} logFile - Arquivo de log afetado
   * @param {object} details - Detalhes adicionais
   */
  logAccessAudit(action, logFile, details = {}) {
    try {
      const auditEntry = {
        action,
        logFile,
        timestamp: new Date().toISOString(),
        userId: process.env.USER || 'system',
        details
      };

      const auditLine = JSON.stringify(auditEntry) + '\n';
      fs.appendFileSync(this.accessAuditFile, auditLine, { mode: 0o600 });
    } catch (error) {
      console.error('Erro ao registrar auditoria de acesso:', error.message);
    }
  }

  /**
   * Retorna histórico de auditoria
   * @param {number} limit - Número máximo de registros
   * @returns {array} Array de registros de auditoria
   */
  getAccessAuditHistory(limit = 100) {
    try {
      if (!fs.existsSync(this.accessAuditFile)) {
        return [];
      }

      const auditLines = fs
        .readFileSync(this.accessAuditFile, 'utf-8')
        .split('\n')
        .filter(line => line.trim());

      return auditLines
        .slice(-limit)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return line;
          }
        });
    } catch (error) {
      console.error('Erro ao ler auditoria:', error.message);
      return [];
    }
  }

  /**
   * Gera relatório completo de segurança dos logs
   * @returns {object} Relatório detalhado
   */
  generateSecurityReport() {
    const integrityReport = this.verifyAllLogIntegrity();
    const auditHistory = this.getAccessAuditHistory(50);

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalLogs: Object.keys(integrityReport.results).length,
        validLogs: integrityReport.results.filter(r => r.valid).length,
        compromisedLogs: integrityReport.results.filter(r => !r.valid).length,
        allValid: integrityReport.allValid
      },
      integrityDetails: integrityReport.results,
      recentAudit: auditHistory.slice(-10),
      recommendations: this.generateRecommendations(integrityReport)
    };
  }

  /**
   * Gera recomendações baseado no relatório
   * @private
   */
  generateRecommendations(integrityReport) {
    const recommendations = [];

    if (!integrityReport.allValid) {
      recommendations.push(
        'CRÍTICO: Logs comprometidos detectados. Investigar imediatamente.'
      );
    }

    if (integrityReport.results.some(r => r.logFile === 'security.log' && !r.valid)) {
      recommendations.push(
        'CRÍTICO: Arquivo security.log pode ter sido alterado. Revisar política de acesso.'
      );
    }

    if (integrityReport.results.length < 2) {
      recommendations.push(
        'Aumentar frequência de verificação de integridade.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Sistema de logs íntegro. Continuar monitoramento.');
    }

    return recommendations;
  }
}

module.exports = LogSecurityManager;
