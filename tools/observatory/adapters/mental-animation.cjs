'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const R = require('../runtime.cjs');
const dir = path.join(R.ROOT,'spatialviz-harness/mental-animation');
const source = R.read(path.join(dir,'source.json'));
const python = process.env.SPATIALVIZ_PYTHON || 'python';
module.exports = function adapter(kind) {
  const digest = crypto.createHash('sha256').update(kind).update(fs.readFileSync(__filename));
  for (const file of ['source.json','task.py','solve.py','design.py','print_face.py','cad_scene.py','../official-folding/artwork.py','../official-rotation/assets/DejaVuSans-Bold.ttf']) {
    digest.update(fs.readFileSync(path.join(dir,file)));
  }
  for (const [file,expected] of Object.entries(source.files)) {
    if (R.sha(fs.readFileSync(path.join(dir,'../vendor/SpatialViz-Bench-c27f9111a267/create_freecad',file)))!==expected) throw Error('Changed upstream source '+file);
  }
  const identity={id:kind+'-movement',revision:digest.digest('hex')};
  return {
    identity,imageFormat:{extension:'png',mediaType:'image/png'},
    generate(seed,parameters,{run}) {
      if (!Number.isSafeInteger(seed)) throw Error('Supply an integer seed');
      const output=path.join(run,kind+'-'+crypto.randomUUID());
      R.atomic(output+'.json',parameters);
      const res=R.execute(run,python,['-B',path.join(dir,'task.py'),'generate',kind,String(seed),output+'.json',output],{kind:'mental-animation-generation'});
      if(res.exitCode!==0) throw Error('Generation failed; see '+output+' and the recorded command log');
      const spec=R.read(path.join(output,'task.json'));
      spec.generator={...identity,seed,parameters};
      spec.rendering={...identity,...spec.rendering,format:'png'};
      spec.verifier=identity;
      return spec;
    },
    render(spec) {
      const image=spec.rendering.image, bytes=Buffer.from(image.pngBase64,'base64');
      if (R.sha(bytes)!==image.sha256) throw Error('Image digest mismatch');
      return bytes;
    },
    verify(args) {
      const spec=R.read(args[0]);
      if (!['rendering','generator','verifier'].every(key=>spec[key].id===identity.id && spec[key].revision===identity.revision)) throw Error('Revision mismatch');
      return spawnSync(python,['-B',path.join(dir,'task.py'),'verify',kind,...args],{stdio:'inherit',windowsHide:true}).status??1;
    }
  };
};
