import globals from 'globals';

export default [
    {
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'module',
            globals: {
                ...globals.node,
            },
        },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-console': 'off',
            'prefer-const': 'error',
            'no-var': 'error',
            eqeqeq: ['error', 'always'],
            curly: ['error', 'multi-line'],
            'no-throw-literal': 'error',
            'prefer-template': 'error',
            'object-shorthand': 'error',
            'arrow-body-style': ['error', 'as-needed'],
        },
    },
    {
        ignores: ['node_modules/', 'dist/', '*.config.js'],
    },
];
