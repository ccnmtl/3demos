import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default [
    js.configs.recommended,
    ...svelte.configs['flat/recommended'],
    {
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'module',
            globals: {
                ...globals.browser
            }
        },
        rules: {
            'svelte/no-at-html-tags': 'off'
        }
    },
    {
        files: ['media/test/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.mocha
            }
        }
    }
];
