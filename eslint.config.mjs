import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '.husky/**']
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  ...tseslint.configs.recommended,
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue']
      }
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.vue'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'vue/multi-word-component-names': 'off'
    }
  },
  {
    files: ['src/renderer/**/*.{ts,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021
      }
    }
  },
  {
    files: ['electron-builder.config.cjs'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  prettier
];
