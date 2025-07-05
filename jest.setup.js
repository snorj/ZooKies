// Jest setup file for ZooKies E2E tests

// Note: In ES modules mode, jest globals are available differently
// We'll handle timeouts in individual test files as needed

// Suppress console warnings during tests
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && args[0].includes && args[0].includes('source-map')) {
    return;
  }
  originalConsoleWarn(...args);
};

// Global test configuration
globalThis.testConfig = {
  headless: process.env.TEST_HEADLESS !== 'false',
  slowMo: process.env.TEST_SLOW_MO ? parseInt(process.env.TEST_SLOW_MO) : 0
}; 