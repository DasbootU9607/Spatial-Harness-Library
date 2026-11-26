'use strict';
module.exports=require('./official-folding.cjs').adapter('CubeUnfolding','official-cube-unfolding',__filename);
if(require.main===module) module.exports.cli();
