const request = require('supertest');
const app = require('../src/app');

// Mock AuthService to avoid DB and business logic
jest.mock('../src/modules/auth/services/AuthService', () => ({
  login: jest.fn().mockResolvedValue({ message: 'ok' })
}));

describe('Rate limit on login', () => {
  test('blocks after exceeding allowed attempts', async () => {
    // Send 6 requests; limit is 5 per minute in routes
    const promises = [];
    for (let i = 0; i < 6; i++) {
      promises.push(request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'pass' }));
    }

    const results = await Promise.all(promises);
    const statuses = results.map(r => r.status);
    // Expect at least one 429
    expect(statuses).toContain(429);
  });
});
