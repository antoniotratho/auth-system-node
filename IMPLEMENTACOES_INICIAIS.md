# Implementações Iniciais - Código Pronto para Usar

---

## 1. ATUALIZAR app.js - SEGURANÇA BÁSICA

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

const loggerMiddleware = require('./shared/middlewares/loggerMiddleware');
const authRoutes = require('./modules/auth/routes/auth.routes');
const errorMiddleware = require('./shared/middlewares/errorMiddleware');
const rateLimitMiddleware = require('./shared/middlewares/rateLimitMiddleware');

// ✅ NOVO: HTTPS redirect
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
    return res.redirect(301, `https://${req.header('host')}${req.url}`);
  }
  next();
});

// ✅ NOVO: Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});

// ✅ MELHORADO: CORS restritivo
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
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
```

---

## 2. NOVO ARQUIVO: src/shared/utils/twoFactor.js

```javascript
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const logger = require('../logger');

class TwoFactorService {
  /**
   * Gera secret TOTP para o usuário
   * @param {string} email - Email do usuário
   * @returns {object} Secret e URL TOTP
   */
  generateSecret(email) {
    const secret = speakeasy.generateSecret({
      name: `AuthSystem (${email})`,
      issuer: 'AuthSystem',
      length: 32
    });
    
    logger.info({
      action: 'twofa_secret_generated',
      email: email
    });
    
    return secret;
  }

  /**
   * Gera QR Code para escanear
   * @param {string} otpauth_url - URL otpauth
   * @returns {Promise<string>} Data URL do QR Code
   */
  async generateQRCode(otpauth_url) {
    try {
      const qrCode = await QRCode.toDataURL(otpauth_url);
      return qrCode;
    } catch (error) {
      logger.error({
        action: 'twofa_qrcode_error',
        error: error.message
      });
      throw new Error('Erro ao gerar QR Code');
    }
  }

  /**
   * Verifica token TOTP
   * @param {string} secret - Secret do usuário
   * @param {string} token - Token de 6 dígitos
   * @returns {boolean} Token válido
   */
  verifyToken(secret, token) {
    const isValid = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Permite 2 janelas de tempo
    });
    
    if (isValid) {
      logger.info({
        action: 'twofa_verified'
      });
    } else {
      logger.warn({
        action: 'twofa_verify_failed',
        reason: 'invalid_token'
      });
    }
    
    return isValid;
  }
}

module.exports = new TwoFactorService();
```

---

## 3. NOVO ARQUIVO: src/shared/utils/passwordReset.js

```javascript
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const logger = require('../logger');

class PasswordResetService {
  /**
   * Gera token seguro para reset de senha
   * @returns {object} Token e data de expiração
   */
  generateToken() {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
    
    logger.info({
      action: 'password_reset_token_generated',
      expiresAt
    });
    
    return {
      token,
      expiresAt
    };
  }

  /**
   * Valida token
   * @param {string} token - Token a validar
   * @param {Date} expiresAt - Data de expiração
   * @returns {boolean} Token válido
   */
  validateToken(token, expiresAt) {
    if (!token || typeof token !== 'string') {
      logger.warn({
        action: 'password_reset_validation_failed',
        reason: 'invalid_token_format'
      });
      return false;
    }

    const now = new Date();
    if (now > expiresAt) {
      logger.warn({
        action: 'password_reset_validation_failed',
        reason: 'token_expired'
      });
      return false;
    }

    return true;
  }
}

module.exports = new PasswordResetService();
```

---

## 4. NOVO ARQUIVO: src/shared/utils/encryption.js

```javascript
const crypto = require('crypto');
const logger = require('../logger');

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || 'dummykey32byteslong1234567890aa', 'utf8').slice(0, 32);

class EncryptionService {
  /**
   * Criptografa dados sensíveis (email)
   * @param {string} plaintext - Dados a criptografar
   * @returns {string} Dados criptografados
   */
  encrypt(plaintext) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      const result = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
      
      logger.debug({
        action: 'data_encrypted'
      });
      
      return result;
    } catch (error) {
      logger.error({
        action: 'encryption_failed',
        error: error.message
      });
      throw new Error('Erro ao criptografar dados');
    }
  }

  /**
   * Descriptografa dados
   * @param {string} encrypted - Dados criptografados
   * @returns {string} Dados originais
   */
  decrypt(encrypted) {
    try {
      const [iv, authTag, ciphertext] = encrypted.split(':');
      const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, Buffer.from(iv, 'hex'));
      
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error({
        action: 'decryption_failed',
        error: error.message
      });
      throw new Error('Erro ao descriptografar dados');
    }
  }
}

module.exports = new EncryptionService();
```

---

## 5. ATUALIZAR: src/shared/utils/jwt.js

```javascript
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../../config/env');
const logger = require('../logger');

class JWTService {
  /**
   * Gera JWT com expiração
   * @param {object} payload - Dados do token
   * @param {string} expiresIn - Tempo de expiração
   * @returns {string} JWT
   */
  generateJWT(payload, expiresIn = '1h') {
    try {
      const token = jwt.sign(payload, jwtSecret, { expiresIn });
      return token;
    } catch (error) {
      logger.error({
        action: 'jwt_generation_failed',
        error: error.message
      });
      throw new Error('Erro ao gerar token');
    }
  }

  /**
   * Verifica e decodifica JWT
   * @param {string} token - Token JWT
   * @returns {object} Payload decodificado
   */
  verifyJWT(token) {
    try {
      const decoded = jwt.verify(token, jwtSecret);
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        logger.warn({
          action: 'jwt_verification_failed',
          reason: 'token_expired'
        });
        throw new Error('Token expirado');
      }
      logger.warn({
        action: 'jwt_verification_failed',
        reason: 'invalid_token'
      });
      throw new Error('Token inválido');
    }
  }
}

module.exports = new JWTService();
```

---

## 6. NOVO ARQUIVO: src/shared/middlewares/authMiddleware.js

```javascript
const jwtService = require('../utils/jwt');
const logger = require('../logger');

module.exports = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      logger.warn({
        action: 'auth_middleware_no_token',
        url: req.url,
        ip: req.ip
      });
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwtService.verifyJWT(token);
    
    // Verificar se é token temporário (após 2FA)
    if (decoded.temporary) {
      logger.warn({
        action: 'auth_middleware_temporary_token',
        userId: decoded.userId
      });
      return res.status(401).json({ error: 'Token temporário - complete 2FA' });
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    logger.warn({
      action: 'auth_middleware_error',
      error: error.message
    });
    res.status(401).json({ error: error.message });
  }
};
```

---

## 7. NOVO ARQUIVO: src/modules/auth/repositories/PasswordResetRepository.js

```javascript
const prisma = require('../../../shared/database/prisma');

class PasswordResetRepository {
  async create(userId, token, expiresAt) {
    return prisma.passwordReset.create({
      data: {
        userId,
        token,
        expiresAt
      }
    });
  }

  async findByToken(token) {
    return prisma.passwordReset.findUnique({
      where: { token }
    });
  }

  async markAsUsed(id) {
    return prisma.passwordReset.update({
      where: { id },
      data: { usedAt: new Date() }
    });
  }

  async deleteExpired() {
    return prisma.passwordReset.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });
  }
}

module.exports = new PasswordResetRepository();
```

---

## 8. NOVO ARQUIVO: src/modules/auth/repositories/ConsentRepository.js

```javascript
const prisma = require('../../../shared/database/prisma');

class ConsentRepository {
  async recordConsent(userId, type, accepted, ipAddress, userAgent) {
    return prisma.consent.create({
      data: {
        userId,
        type,
        accepted,
        acceptedAt: new Date(),
        ipAddress,
        userAgent,
        version: '1.0'
      }
    });
  }

  async findLatestConsent(userId, type) {
    return prisma.consent.findFirst({
      where: { userId, type },
      orderBy: { createdAt: 'desc' }
    });
  }

  async revokeConsent(userId, type) {
    return prisma.consent.updateMany({
      where: { userId, type, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  async getConsentHistory(userId) {
    return prisma.consent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }
}

module.exports = new ConsentRepository();
```

---

## 9. NOVO ARQUIVO: src/shared/utils/email.js

```javascript
const nodemailer = require('nodemailer');
const logger = require('../logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  /**
   * Envia email de reset de senha
   * @param {string} email - Email do destinatário
   * @param {string} resetLink - Link de reset
   */
  async sendPasswordResetEmail(email, resetLink) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Recuperação de Senha - AuthSystem',
        html: `
          <h2>Recuperação de Senha</h2>
          <p>Você solicitou a recuperação de senha.</p>
          <p>Clique no link abaixo para redefinir sua senha:</p>
          <a href="${resetLink}">Redefinir Senha</a>
          <p>Este link expira em 15 minutos.</p>
          <p>Se você não solicitou isso, ignore este email.</p>
        `
      });

      logger.info({
        action: 'password_reset_email_sent',
        email: email
      });
    } catch (error) {
      logger.error({
        action: 'password_reset_email_failed',
        email: email,
        error: error.message
      });
      throw new Error('Erro ao enviar email');
    }
  }

  /**
   * Envia email de confirmação de conta
   * @param {string} email - Email do destinatário
   * @param {string} confirmationLink - Link de confirmação
   */
  async sendConfirmationEmail(email, confirmationLink) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Confirme seu Email - AuthSystem',
        html: `
          <h2>Confirmação de Email</h2>
          <p>Obrigado por se registrar!</p>
          <p>Clique no link abaixo para confirmar seu email:</p>
          <a href="${confirmationLink}">Confirmar Email</a>
          <p>Este link expira em 24 horas.</p>
        `
      });

      logger.info({
        action: 'confirmation_email_sent',
        email: email
      });
    } catch (error) {
      logger.error({
        action: 'confirmation_email_failed',
        email: email,
        error: error.message
      });
      throw new Error('Erro ao enviar email');
    }
  }
}

module.exports = new EmailService();
```

---

## 10. EXEMPLO .env

```env
# Servidor
PORT=3000
NODE_ENV=development

# Banco de Dados
DATABASE_URL=mysql://root:password@localhost:3306/auth_system

# JWT
JWT_SECRET=sua-chave-secreta-muito-segura-aqui-com-32-caracteres-min
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Segurança
ENCRYPTION_KEY=YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY3OA==

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_LOGIN_WINDOW_MS=60000
RATE_LIMIT_LOGIN_MAX=5

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app-aqui
SMTP_FROM=noreply@seudominio.com

# Redis (para blacklist de tokens - opcional)
REDIS_URL=redis://localhost:6379

# LGPD
DATA_RETENTION_DAYS=365
```

---

## 11. ATUALIZAR UserRepository

Adicionar método de update:

```javascript
async update(id, data) {
  return prisma.user.update({
    where: { id },
    data
  });
}

async delete(id) {
  return prisma.user.delete({
    where: { id }
  });
}
```

---

## 12. TESTES BÁSICOS

**Arquivo**: `tests/auth.test.js`

```javascript
const request = require('supertest');
const app = require('../src/app');

describe('Authentication', () => {
  test('Should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'SecurePassword123!'
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.user.email).toBe('test@example.com');
  });

  test('Should login with correct credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'SecurePassword123!'
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.token).toBeDefined();
  });

  test('Should reject login with wrong password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'WrongPassword'
      });

    expect(response.statusCode).toBe(400);
  });
});
```

---

## 13. PRÓXIMAS ETAPAS DE IMPLEMENTAÇÃO

1. **Hoje**:
   - [ ] Copiar códigos acima para os respectivos arquivos
   - [ ] Atualizar .env com variáveis
   - [ ] Executar migrations Prisma

2. **Amanhã**:
   - [ ] Testar autenticação básica
   - [ ] Implementar endpoints 2FA
   - [ ] Implementar endpoints de reset de senha

3. **Próxima semana**:
   - [ ] Implementar LGPD
   - [ ] Adicionar criptografia de email
   - [ ] Criar testes automatizados

---

*Última atualização: 25 de maio de 2026*
