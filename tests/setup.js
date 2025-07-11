// Test setup for Jest
import 'dotenv/config';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.LOG_LEVEL = 'silent';

// Mock console for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: originalConsole.error, // Keep error for debugging
};
