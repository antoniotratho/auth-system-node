const express = require('express');
const cors = require('cors');
const env = require('./config/env');

const app = express();
app.set('trust proxy', 1);

const loggerMiddleware = require('./shared/middlewares/loggerMiddleware');
const authRoutes = require('./modules/auth/routes/auth.routes');
const auditRoutes = require('./modules/audit/routes/auditRoutes');
const errorMiddleware = require('./shared/middlewares/errorMiddleware');
const rateLimitMiddleware = require('./shared/middlewares/rateLimitMiddleware');
const logger = require('./shared/logger');

// ✅ HTTPS redirect (produção)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
    logger.warn({
      action: 'non_secure_connection_blocked',
      ip: req.ip,
      url: req.url
    });
    return res.redirect(301, `https://${req.header('host')}${req.url}`);
  }
  next();
});

// ✅ Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});

// ✅ CORS restritivo
const allowedOrigins = env.allowedOrigins.map((origin) => origin.trim());
app.use(cors({
  origin: (origin, callback) => {
    const normalizedOrigin = origin?.trim();

    if (!normalizedOrigin || allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      logger.warn({
        action: 'cors_blocked',
        origin: normalizedOrigin
      });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
}));

app.use(express.json());
app.use(rateLimitMiddleware);
app.use(loggerMiddleware);

app.use('/api/auth', authRoutes);
app.use('/api/audit', auditRoutes);

app.use(errorMiddleware);


module.exports = app;
