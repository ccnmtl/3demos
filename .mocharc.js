// Integrate babel with mocha for proper ES module support. See:
//   https://stackoverflow.com/a/60522428/173630
module.exports = {
    require: [
        '@babel/register',
        'regenerator-runtime/runtime',
    ],
};
