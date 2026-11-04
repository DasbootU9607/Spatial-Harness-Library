'use strict';
const support=require('./rotation-support.cjs');
module.exports=support.make(2);
if(require.main===module)support.cli(module.exports);
