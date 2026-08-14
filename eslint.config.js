import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '.vercel/**',
      'output/**',
      'tmp/**',
      'storage/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': 'off',
      'max-statements-per-line': ['error', { max: 1 }],
    },
  },
  {
    files: ['**/*.test.ts', '**/database/seed*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    // The Vercel entrypoint must reference the ambient Express augmentation
    // without importing it: a .d.ts emits no JavaScript to load at runtime.
    files: ['api/**/*.ts'],
    rules: { '@typescript-eslint/triple-slash-reference': 'off' },
  },
);
