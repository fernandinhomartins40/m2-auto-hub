module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  roots: ['<rootDir>/tests'],
  setupFiles: ['<rootDir>/tests/setup-env.cjs'],
  moduleNameMapper: {
    '^@config/(.*)\\.js$': '<rootDir>/src/config/$1',
    '^@shared/(.*)\\.js$': '<rootDir>/src/shared/$1',
    '^@modules/(.*)\\.js$': '<rootDir>/src/modules/$1',
    '^@middlewares/(.*)\\.js$': '<rootDir>/src/middlewares/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true, tsconfig: 'tsconfig.json' }],
  },
};
