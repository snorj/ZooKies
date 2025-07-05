export default {
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
  verbose: true,
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
}; 