// Jest setup file

// Extend Jest timeout for integration tests
jest.setTimeout(10000);

// Suppress console logs during tests unless debugging
if (process.env.DEBUG !== 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
}

// Clean up after all tests
afterAll(() => {
  jest.clearAllMocks();
});
