module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  forceExit: true,
  coveragePathIgnorePatterns: ['/node_modules/', '/src/dataconnect-generated/'],
  collectCoverageFrom: [
    'functions/index.js',
    'tools/generate-config.js',
    'js/admin.js',
    'js/api-client.js',
    'js/applicant.js',
    'js/training.js',
  ],
  // Force functions/index.js to resolve modules from root so jest.mock() works
  moduleNameMapper: {
    '^mongoose$': '<rootDir>/node_modules/mongoose',
    '^@sendgrid/mail$': '<rootDir>/node_modules/@sendgrid/mail',
    '^multer$': '<rootDir>/node_modules/multer',
    '^express$': '<rootDir>/node_modules/express',
    '^express-rate-limit$': '<rootDir>/node_modules/express-rate-limit',
    '^bcryptjs$': '<rootDir>/node_modules/bcryptjs',
    '^jsonwebtoken$': '<rootDir>/node_modules/jsonwebtoken',
    '^cors$': '<rootDir>/node_modules/cors',
    '^dotenv$': '<rootDir>/node_modules/dotenv',
  },
};
