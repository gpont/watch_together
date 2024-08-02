module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
  coverageReporters: [
    "json-summary",
    "text",
    "lcov"
  ],
  coverageThreshold: {
    global: {
      branches: 77,
      functions: 98,
      lines: 93,
      statements: 93
    }
  }
};
