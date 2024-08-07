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
      branches: 81,
      functions: 98,
      lines: 98,
      statements: 98
    }
  }
};
