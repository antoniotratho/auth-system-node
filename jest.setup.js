// Global test setup: mock EmailService and logger to avoid external side-effects

process.env.NODE_ENV = 'test';

// Mock logger to capture calls without writing files
jest.mock('./src/shared/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Provide a default mock for EmailService used in controllers
jest.mock('./src/shared/services/EmailService', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  send2FASetupEmail: jest.fn().mockResolvedValue(true),
  sendAccountDeleteEmail: jest.fn().mockResolvedValue(true)
}));
