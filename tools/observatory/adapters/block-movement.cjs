const adapter = require('./mental-animation.cjs')('block');
module.exports = adapter;
if (require.main === module) process.exitCode = adapter.verify(process.argv.slice(2));
