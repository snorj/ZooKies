module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  collectCoverageFrom: [
    'shared/**/*.js',
    'tests/**/*.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/scripts/'
  ],
  verbose: true
}; 