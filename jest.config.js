module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/tests/**/*.test.js',
    '<rootDir>/src/**/__tests__/**/*.js'
  ],
  
  // Coverage configuration
  collectCoverage: false, // Enable only when needed
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/tests/**',
    '!src/config/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  
  // Test execution settings
  testTimeout: 30000, // 30 seconds default timeout
  verbose: true,
  
  // Process management
  forceExit: true,
  detectOpenHandles: true,
  
  // Performance settings
  maxWorkers: '50%', // Use 50% of available CPU cores
  
  // Watch mode settings
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/.git/'
  ],
  
  // CI settings
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml',
      ancestorSeparator: ' › ',
      uniqueOutputName: 'false',
      suiteNameTemplate: '{filepath}',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}'
    }]
  ],
  
  // Module settings
  moduleFileExtensions: ['js', 'json'],
  
  // Transform settings (if needed for ES6 modules in future)
  transform: {},
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true
};