const express = require('express');
const cors = require('cors');

const app = express();

const loggerMiddleware = require('./shared/middlewares/loggerMiddleware');
const authRoutes = require('./modules/auth/routes/auth.routes');
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
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin.trim())) {
      callback(null, true);
    } else {
      logger.warn({
        action: 'cors_blocked',
        origin: origin,
        ip: req ? req.ip : 'unknown'
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

app.use(errorMiddleware);


module.exports = app;