module.exports = {
    parserOptions: {
        ecmaVersion: 2019,
        sourceType: 'module'
    },
    env: {
        es6: true,
        browser: true
    },
    extends: [
        'plugin:svelte/recommended',
        // TODO: enable these rules
        // 'eslint:recommended'
    ]
};
