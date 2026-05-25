# Plano de Implementação - Melhorias de Segurança
**Prioridade**: CRÍTICA
**Estimativa Total**: 3-4 semanas

---

## 1. FASE 1: AUTENTICAÇÃO DE DOIS FATORES (2FA)

### 1.1 Modificar Schema Prisma
```prisma
model User {
  id                    Int      @id @default(autoincrement())
  email                 String   @unique
  password              String   // hash bcrypt
  twoFactorSecret       String?  // secret TOTP
  twoFactorEnabled      Boolean  @default(false)
  failedAttempts        Int      @default(0)
  lockUntil             DateTime?
  lastFailedLoginAt     DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  // LGPD
  consentGiven          Boolean  @default(false)
  consentDate           DateTime?
  consentVersion        String?
}
```

### 1.2 Criar Serviço 2FA
**Arquivo**: `src/shared/utils/twoFactor.js`
```javascript
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

class TwoFactorService {
  generateSecret(email) {
    return speakeasy.generateSecret({
      name: `AuthSystem (${email})`,
      issuer: 'AuthSystem',
      length: 32
    });
  }

  async generateQRCode(secret) {
    return await QRCode.toDataURL(secret.otpauth_url);
  }

  verifyToken(secret, token) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Permite 2 janelas de tempo (60s + 30s antes/depois)
    });
  }
}

module.exports = new TwoFactorService();
```

### 1.3 Novos Endpoints

#### POST /api/auth/2fa/setup
- Retorna QR Code para escanear
- Retorna secret como backup

#### POST /api/auth/2fa/verify-setup
- Valida token TOTP antes de ativar
- Armazena secret no usuário

#### POST /api/auth/login/2fa
- Valida token TOTP após login primário
- Emite JWT se sucesso

#### POST /api/auth/logout
- Invalida JWT (usar blacklist em Redis)
- Limpa sessão

---

## 2. FASE 1: RECUPERAÇÃO DE SENHA

### 2.1 Modificar Schema Prisma
```prisma
model PasswordReset {
  id        Int      @id @default(autoincrement())
  userId    Int
  token     String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model User {
  // ... campos existentes
  passwordResets PasswordReset[]
}
```

### 2.2 Novos Endpoints

#### POST /api/auth/forgot-password
- Recebe email
- Gera token com UUID v4
- Expira em 15 minutos
- Envia email com link
- Log da solicitação

#### POST /api/auth/reset-password/:token
- Valida token (expiração + já usado)
- Define nova senha
- Marca como usado
- Log de sucesso/falha
- Invalida todos os JWT do usuário

---

## 3. FASE 1: CORREÇÃO DE CORS E SEGURANÇA

### 3.1 app.js - CORS Restritivo
```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
}));
```

### 3.2 app.js - Adicionar Headers de Segurança
```javascript
// HTTPS obrigatório
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
    return res.redirect(301, `https://${req.header('host')}${req.url}`);
  }
  next();
});

// Headers de segurança
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

---

## 4. FASE 1: RATE LIMITING COM BLOQUEIO DE CONTA

### 4.1 Atualizar AuthService
```javascript
async login(email, password) {
  const user = await UserRepository.findByEmail(email);
  
  if (!user) {
    logger.warn(`Login falhou - usuário não encontrado: ${email}`);
    throw new Error('Credenciais inválidas');
  }

  // Verificar se conta está bloqueada
  if (user.lockUntil && user.lockUntil > new Date()) {
    const minutosRestantes = Math.ceil((user.lockUntil - new Date()) / 60000);
    logger.warn(`Tentativa em conta bloqueada: ${email}`);
    throw new Error(`Conta bloqueada por ${minutosRestantes} minutos`);
  }

  const isPasswordValid = await hash.comparePassword(password, user.password);
  
  if (!isPasswordValid) {
    // Incrementar falhas
    const novasTentativas = user.failedAttempts + 1;
    let novoLockUntil = null;
    
    if (novasTentativas >= 5) {
      novoLockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    }
    
    await UserRepository.update(user.id, {
      failedAttempts: novasTentativas,
      lockUntil: novoLockUntil,
      lastFailedLoginAt: new Date()
    });
    
    logger.warn(`Login falhou - senha incorreta: ${email} (tentativa ${novasTentativas})`);
    throw new Error('Credenciais inválidas');
  }

  // Reset falhas ao login bem-sucedido
  await UserRepository.update(user.id, {
    failedAttempts: 0,
    lockUntil: null
  });

  logger.info(`Login bem-sucedido: ${email}`);
  
  // Retornar status 2FA se ativado
  if (user.twoFactorEnabled) {
    return {
      requiresTwoFactor: true,
      tempToken: jwt.generateJWT({ userId: user.id, temporary: true }, '5m')
    };
  }

  return {
    token: jwt.generateJWT({ userId: user.id })
  };
}
```

---

## 5. FASE 2: CONFORMIDADE LGPD

### 5.1 Schema de Consentimento
```prisma
model Consent {
  id                 Int      @id @default(autoincrement())
  userId             Int
  version            String   // ex: "1.0"
  type               String   // "authentication", "newsletter", etc
  accepted           Boolean
  acceptedAt         DateTime
  revokedAt          DateTime?
  ipAddress          String?
  userAgent          String?
  createdAt          DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, type, version])
}

model DataProcessing {
  id               Int      @id @default(autoincrement())
  dataType         String   // "email", "password_hash", "ip_address"
  purpose          String   // "autenticação", "recuperação de conta"
  legalBasis       String   // "consentimento", "execução de contrato"
  retentionDays    Int      // dias até exclusão
  encryptionMethod String?  // "aes256", "bcrypt"
  createdAt        DateTime @default(now())
}
```

### 5.2 Novos Endpoints LGPD

#### GET /api/auth/my-data
```
Retorna todos os dados do usuário em JSON:
{
  id, email, createdAt, lastLogin,
  consentHistory, dataProcessing
}
```

#### POST /api/auth/export-data
```
Retorna JSON em anexo (download)
```

#### DELETE /api/auth/delete-account
```
1. Solicita confirmação via email
2. Token de confirmação (15 min)
3. Solicita password
4. Executa exclusão em cascata
5. Logs de exclusão retidos por 1 ano
```

#### POST /api/auth/consent
```
Registra consentimento com finalidade
{
  type: "authentication",
  accepted: true
}
```

---

## 6. FASE 2: CRIPTOGRAFIA DE DADOS EM REPOUSO

### 6.1 Criar Serviço de Criptografia
**Arquivo**: `src/shared/utils/crypto.js`
```javascript
const crypto = require('crypto');

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes base64

class CryptoService {
  encryptEmail(email) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'base64'), iv);
    
    let encrypted = cipher.update(email, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decryptEmail(encryptedEmail) {
    const [iv, authTag, encrypted] = encryptedEmail.split(':');
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'base64'), Buffer.from(iv, 'hex'));
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

module.exports = new CryptoService();
```

---

## 7. VARIÁVEIS DE AMBIENTE NECESSÁRIAS

```env
# Existentes
PORT=3000
NODE_ENV=development
DATABASE_URL=mysql://user:pass@localhost:3306/auth_db
JWT_SECRET=seu-secret-muito-seguro-aqui

# Novas - Segurança
ALLOWED_ORIGINS=http://localhost:3000,https://seudominio.com
ENCRYPTION_KEY=sua-chave-32bytes-em-base64-aqui
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_LOGIN_WINDOW_MS=60000
RATE_LIMIT_LOGIN_MAX=5
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app-aqui
SMTP_FROM=noreply@seudominio.com

# Redis (para blacklist de tokens)
REDIS_URL=redis://localhost:6379

# LGPD
DATA_RETENTION_DAYS=365
```

---

## 8. DEPENDÊNCIAS ADICIONAIS

```bash
npm install crypto uuid redis dotenv-schema joi
npm install --save-dev jest supertest
```

---

## 9. CHECKLIST DE IMPLEMENTAÇÃO

### Semana 1
- [ ] Atualizar schema Prisma
- [ ] Implementar 2FA (setup + verify + login)
- [ ] Implementar logout com blacklist Redis
- [ ] Corrigir CORS
- [ ] Adicionar headers de segurança

### Semana 2
- [ ] Implementar recuperação de senha
- [ ] Implementar rate limiting com bloqueio de conta
- [ ] Implementar criptografia de email
- [ ] Adicionar validação de email

### Semana 3
- [ ] Implementar endpoints LGPD
- [ ] Criar schema de consentimento
- [ ] Implementar auditoria de logs
- [ ] Testes automatizados

### Semana 4
- [ ] Documentação técnica
- [ ] Teste de penetração simples
- [ ] Deploy com HTTPS
- [ ] Monitoramento de segurança

---

## 10. TESTES DE SEGURANÇA INICIAIS

```javascript
// tests/security.test.js

describe('Security Tests', () => {
  test('CORS should reject requests from unknown origins', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://attacker.com')
      .send({ email: 'test@test.com', password: 'pass' });
    
    expect(response.statusCode).toBe(403);
  });

  test('Account should lock after 5 failed login attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' });
    }
    
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'correct' });
    
    expect(response.body.error).toMatch(/bloqueada/i);
  });

  test('2FA token should expire after 30 seconds', async () => {
    // Implementar teste de expiração
  });
});
```

---

## 11. EXEMPLOS DE LOGS ESPERADOS

```json
// Sucesso 2FA
{
  "timestamp": "2026-05-25T10:30:00Z",
  "level": "info",
  "action": "2fa_setup_completed",
  "userId": 123,
  "email": "user@example.com",
  "ip": "192.168.1.1"
}

// Falha de recuperação de senha
{
  "timestamp": "2026-05-25T10:35:00Z",
  "level": "warn",
  "action": "password_reset_failed",
  "reason": "token_expired",
  "email": "user@example.com"
}

// LGPD - Consulta de dados
{
  "timestamp": "2026-05-25T10:40:00Z",
  "level": "info",
  "action": "data_export_requested",
  "userId": 123,
  "ip": "192.168.1.1"
}
```

---

## 12. REFERÊNCIAS E NORMAS

- **OWASP Top 10 2021**: A07:2021 – Identification and Authentication Failures
- **NIST SP 800-63B**: Digital Identity Guidelines - Authentication and Lifecycle Management
- **LGPD (Lei nº 13.709/2018)**: Lei Geral de Proteção de Dados Pessoais
- **RFC 6238**: Time-Based One-Time Password Algorithm
- **RFC 8949**: Concise Binary Object Representation (CBOR)

---

*Último atualizado: 25 de maio de 2026*
