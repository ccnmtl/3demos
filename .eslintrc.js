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
        // TODO: turn this on
        // 'eslint:recommended'
    ],
    plugins: [
        'svelte3'
    ],
    overrides: [
        {
            files: ['*.svelte'],
            processor: 'svelte3/svelte3'
        }
    ],
    rules: {
        // ...
    },
    settings: {
        // ...
    }
};
