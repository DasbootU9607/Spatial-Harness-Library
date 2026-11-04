'use strict';
// Validator for the deliberately small JSON Schema vocabulary used by this library.
const assert=require('node:assert/strict');
function validate(value,schema,label='value'){
 const type=Array.isArray(value)?'array':value===null?'null':typeof value==='number'&&Number.isInteger(value)?'integer':typeof value;
 if(schema.type){const allowed=Array.isArray(schema.type)?schema.type:[schema.type];assert(allowed.includes(type)||(type==='integer'&&allowed.includes('number')),label+': wrong type');}
 if(Object.hasOwn(schema,'const'))assert.deepEqual(value,schema.const,label+': wrong constant');
 if(schema.enum)assert(schema.enum.includes(value),label+': unsupported value');
 if(schema.minimum!==undefined&&typeof value==='number')assert(value>=schema.minimum,label+': below minimum');
 if(schema.pattern&&typeof value==='string')assert(new RegExp(schema.pattern).test(value),label+': invalid pattern');
 if(value&&type==='object'){
  for(const key of schema.required||[])assert(Object.hasOwn(value,key),label+': missing '+key);
  for(const [key,item] of Object.entries(value)){if(schema.properties?.[key])validate(item,schema.properties[key],label+'.'+key);else if(schema.additionalProperties===false)assert.fail(label+': unknown '+key);else if(schema.additionalProperties&&typeof schema.additionalProperties==='object')validate(item,schema.additionalProperties,label+'.'+key);}
 }
 if(type==='array'&&schema.items)value.forEach((x,i)=>validate(x,schema.items,label+'['+i+']'));
 return value;
}
module.exports={validate};
