module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  collectCoverageFrom: [
    'shared/**/*.js',
    'test/**/*.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/scripts/'
  ],
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Mock ES modules imports to work with CommonJS
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  // Transform ES modules in node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(snarkjs)/)'
  ]
}; 