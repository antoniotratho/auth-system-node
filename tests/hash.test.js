const { hashPassword, comparePassword } = require('../src/shared/utils/hash');

describe('Hash util', () => {
  test('hash and compare password', async () => {
    const password = 'My$ecret123!';
    const hash = await hashPassword(password);
    expect(typeof hash).toBe('string');
    const match = await comparePassword(password, hash);
    expect(match).toBe(true);
  });

  test('salt unique per hash', async () => {
    const password = 'samepassword';
    const h1 = await hashPassword(password);
    const h2 = await hashPassword(password);
    expect(h1).not.toEqual(h2);
  });
});
