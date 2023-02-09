/* eslint-env node */
module.exports = {
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
    },
    env: {
        es6: true,
        browser: true
    },
    rules: {
        'svelte/no-at-html-tags': 'off'
    },
    extends: [
        'plugin:svelte/recommended',
        'eslint:recommended'
    ]
};
