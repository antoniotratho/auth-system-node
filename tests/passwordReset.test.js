const request = require('supertest');
const app = require('../src/app');

// Mock repositories to avoid DB access
jest.mock('../src/modules/auth/repositories/UserRepository', () => ({
  findByEmail: jest.fn(),
  update: jest.fn(),
  // other methods may be added in tests
}));

jest.mock('../src/modules/auth/repositories/PasswordResetRepository', () => ({
  create: jest.fn(),
  findByToken: jest.fn(),
  markAsUsed: jest.fn()
}));

const UserRepository = require('../src/modules/auth/repositories/UserRepository');
const PasswordResetRepository = require('../src/modules/auth/repositories/PasswordResetRepository');
const EmailService = require('../src/shared/services/EmailService');

describe('Password reset flow (forgot-password, validate, reset)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/auth/forgot-password returns 200 and creates token when user exists', async () => {
    const fakeUser = { id: 42, email: 'test@example.com' };
    UserRepository.findByEmail.mockResolvedValue(fakeUser);
    PasswordResetRepository.create.mockResolvedValue({ id: 1, token: 'token123', userId: 42 });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'test@example.com' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(PasswordResetRepository.create).toHaveBeenCalled();
    expect(EmailService.sendPasswordResetEmail).toHaveBeenCalledWith('test@example.com', expect.any(String), expect.any(String));
    expect(res.body.message).toBeDefined();
  });

  test('POST /api/auth/forgot-password with missing email returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({})
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
  });

  test('POST /api/auth/reset-password/:token succeeds with valid token', async () => {
    const token = 'valid-token-1';
    const future = new Date(Date.now() + 15 * 60 * 1000);
    PasswordResetRepository.findByToken.mockResolvedValue({ id: 5, token, userId: 99, expiresAt: future, usedAt: null });
    UserRepository.update.mockResolvedValue({ id: 99 });
    PasswordResetRepository.markAsUsed.mockResolvedValue({ id: 5, usedAt: new Date() });

    const res = await request(app)
      .post(`/api/auth/reset-password/${token}`)
      .send({ password: 'StrongP@ss1', passwordConfirm: 'StrongP@ss1' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(UserRepository.update).toHaveBeenCalledWith(99, expect.any(Object));
    expect(PasswordResetRepository.markAsUsed).toHaveBeenCalledWith(5);
    expect(res.body.message).toBe('Senha redefinida com sucesso');
  });

  test('POST /api/auth/reset-password/:token fails for expired token', async () => {
    const token = 'expired-token';
    const past = new Date(Date.now() - 60 * 1000);
    PasswordResetRepository.findByToken.mockResolvedValue({ id: 6, token, userId: 100, expiresAt: past, usedAt: null });

    const res = await request(app)
      .post(`/api/auth/reset-password/${token}`)
      .send({ password: 'StrongP@ss1', passwordConfirm: 'StrongP@ss1' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/expirad/i);
  });

  test('POST /api/auth/reset-password/:token fails for invalid token', async () => {
    const token = 'no-such-token';
    PasswordResetRepository.findByToken.mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/auth/reset-password/${token}`)
      .send({ password: 'StrongP@ss1', passwordConfirm: 'StrongP@ss1' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/inválid/i);
  });

  test('GET /api/auth/reset-password/:token/validate returns token valid', async () => {
    const token = 'valid-token-2';
    const future = new Date(Date.now() + 5 * 60 * 1000);
    PasswordResetRepository.findByToken.mockResolvedValue({ id: 7, token, userId: 101, expiresAt: future, usedAt: null });

    const res = await request(app)
      .get(`/api/auth/reset-password/${token}/validate`)
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Token válido');
  });

  test('GET /api/auth/reset-password/:token/validate returns expired for old token', async () => {
    const token = 'expired-validate';
    const past = new Date(Date.now() - 1000 * 60);
    PasswordResetRepository.findByToken.mockResolvedValue({ id: 8, token, userId: 102, expiresAt: past, usedAt: null });

    const res = await request(app)
      .get(`/api/auth/reset-password/${token}/validate`)
      .set('Accept', 'application/json');

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/expirad/i);
  });
});
