module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/server/**/*.test.js'],
  collectCoverageFrom: [
    'server.js',
    'agent-tools.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000
};
