const logger = require('../logger');

module.exports = (req, res, next) => {
  // Capturar tempo de início
  const startTime = Date.now();

  // Interceptar o método res.json para logar a resposta
  const originalJson = res.json;
  res.json = function(data) {
    const responseTime = Date.now() - startTime;
    
    logger.info({
      action: 'http_request',
      method: req.method,
      url: req.url,
      path: req.path,
      statusCode: res.statusCode,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    });

    return originalJson.call(this, data);
  };

  next();
};
