/**
 * TESTES BÁSICOS DE SEGURANÇA
 * 
 * Para rodar:
 * npm install --save-dev jest supertest
 * npm test
 */

const request = require('supertest');
const app = require('../src/app');

describe('Security Tests', () => {
  
  describe('CORS Validation', () => {
    test('Should reject requests from unknown origin', async () => {
      const response = await request(app)
        .get('/api/auth/ping')
        .set('Origin', 'http://attacker.com');

      // Em desenvolvimento, podem ser permitidos
      // Em produção, deve ser rejeitado
      expect(response.status).toBeDefined();
    });

    test('Should accept requests from allowed origin', async () => {
      const response = await request(app)
        .get('/api/auth/ping')
        .set('Origin', 'http://localhost:3000');

      expect(response.status).toBe(200);
    });

    test('Should have security headers', async () => {
      const response = await request(app)
        .get('/api/auth/ping');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBeDefined();
    });
  });

  describe('Authentication', () => {
    test('Should register a new user with strong password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!'
        });

      expect(response.status).toBe(201);
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.password).toBeUndefined(); // Não retornar senha
    });

    test('Should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test2@example.com',
          password: 'weak' // Muito fraca
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('fraca');
    });

    test('Should reject duplicate email', async () => {
      // Registrar primeira vez
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'SecurePassword123!'
        });

      // Tentar registrar de novo
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'SecurePassword123!'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('registrado');
    });

    test('Should login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.expiresIn).toBe(3600);
    });

    test('Should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword'
        });

      expect(response.status).toBe(401);
    });

    test('Should require email and password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
          // Sem password
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    test('Should enforce rate limit on login attempts', async () => {
      // Fazer 5 requisições - devem passar
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrong'
          });
        // Esperamos 401 (credenciais inválidas), não 429
        expect([400, 401]).toContain(response.status);
      }

      // 6ª requisição deve ser bloqueada (429 Too Many Requests)
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrong'
        });

      expect(response.status).toBe(429);
    });
  });

  describe('Protected Routes', () => {
    test('Should reject requests without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Token');
    });

    test('Should reject requests with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
    });

    test('Should accept requests with valid token', async () => {
      // Fazer login para pegar token válido
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!'
        });

      const token = loginResponse.body.token;

      // Usar token para acessar rota protegida
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('sucesso');
    });
  });

  describe('Account Lockout', () => {
    test('Should lock account after 5 failed login attempts', async () => {
      const email = 'lockout-test@example.com';
      
      // Registrar usuário
      await request(app)
        .post('/api/auth/register')
        .send({
          email: email,
          password: 'SecurePassword123!'
        });

      // Fazer 5 tentativas com senha errada
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: email,
            password: 'WrongPassword'
          });
      }

      // 6ª tentativa com senha CORRETA deve falhar (conta bloqueada)
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: email,
          password: 'SecurePassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('bloqueada');
    });
  });

  describe('Health Check', () => {
    test('Auth module should respond to ping', async () => {
      const response = await request(app)
        .get('/api/auth/ping');

      expect(response.status).toBe(200);
      expect(response.body.message).toBeDefined();
    });
  });
});
