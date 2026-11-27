const adapter = require('./mental-animation.cjs')('arrow');
module.exports = adapter;
if (require.main === module) process.exitCode = adapter.verify(process.argv.slice(2));
