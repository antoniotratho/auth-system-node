const twoFactor = require('../src/shared/utils/twoFactor');

describe('Two-Factor util (TOTP)', () => {
  test('generateSecret returns secret and otpauth_url and backup codes', () => {
    const result = twoFactor.generateSecret('user@example.com');
    expect(result).toHaveProperty('secret');
    expect(result).toHaveProperty('otpauth_url');
    expect(result).toHaveProperty('backup_codes');
    expect(Array.isArray(result.backup_codes)).toBe(true);
  });

  test('generateToken and verifyToken work together', () => {
    const { secret } = twoFactor.generateSecret('user2@example.com');
    const token = twoFactor.generateToken(secret);
    const ok = twoFactor.verifyToken(secret, token);
    expect(ok).toBe(true);
  });

  test('verifyToken rejects invalid formats', () => {
    const { secret } = twoFactor.generateSecret('user3@example.com');
    expect(twoFactor.verifyToken(secret, 'abc')).toBe(false);
    expect(twoFactor.verifyToken(secret, '')).toBe(false);
    expect(twoFactor.verifyToken(secret, null)).toBe(false);
  });
});
