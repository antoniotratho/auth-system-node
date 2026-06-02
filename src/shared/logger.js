const { createLogger, format, transports } = require('winston');
const path = require('path');
const LogSecurityManager = require('./utils/logSecurityManager');

// ✅ Criar diretório de logs se não existir
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// ✅ Inicializar gerenciador de segurança de logs
const logSecurityManager = new LogSecurityManager(logsDir);

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }), // Incluir stack trace de erros
    format.json()
  ),
  defaultMeta: { service: 'auth-system' },
  transports: [
    // ✅ Logs de erro em arquivo separado
    new transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5 // Manter últimos 5 arquivos
    }),
    // ✅ Logs de segurança (warn+)
    new transports.File({
      filename: path.join(logsDir, 'security.log'),
      level: 'warn',
      maxsize: 5242880,
      maxFiles: 10
    }),
    // ✅ Todos os logs
    new transports.File({
      filename: path.join(logsDir, 'app.log'),
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// ✅ Em desenvolvimento, também logar no console
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ level, message, timestamp, ...meta }) => {
          return `${timestamp} [${level}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      )
    })
  );
}

// ✅ Após cada escrita de log, atualizar hash de integridade
const originalEmit = logger.emit;
logger.emit = function(...args) {
  originalEmit.apply(this, args);
  
  // Atualizar hashes dos arquivos de log periodicamente
  setImmediate(() => {
    ['error.log', 'security.log', 'app.log'].forEach(logFile => {
      const filePath = path.join(logsDir, logFile);
      if (fs.existsSync(filePath)) {
        const hash = logSecurityManager.calculateFileHash(filePath);
        const lineCount = fs.readFileSync(filePath, 'utf-8').split('\n').length;
        logSecurityManager.recordLogHash(logFile, hash, lineCount);
        logSecurityManager.setAppendOnlyPermissions(filePath);
      }
    });
  });
};

module.exports = logger;
module.exports.logSecurityManager = logSecurityManager;
