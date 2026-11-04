'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'../..');
function ensure(root) {
  const result=spawnSync('python',[path.join(__dirname,'start-viewer.py'),path.resolve(root),process.execPath],{encoding:'utf8',windowsHide:true,timeout:15000});
  if(result.status!==0)throw Error('Local viewer unavailable: '+(result.stderr||result.error?.message));return result.stdout.trim();
}
if(require.main===module){
  const root=path.resolve(process.argv[2]);
  const server=http.createServer((req,res)=>{
    if(req.method!=='GET'||!/^127\.0\.0\.1:\d+$/.test(req.headers.host||'')){res.writeHead(403).end();return;}
    try{
      const u=new URL(req.url,'http://localhost');
      if(u.pathname==='/api/health'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({application:'spatial-harness-observatory'}));return;}
      if(u.pathname==='/api/runs'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(fs.readdirSync(root).filter(x=>/^build-[a-f0-9-]+$/.test(x)).map(id=>({id,title:JSON.parse(fs.readFileSync(path.join(root,id,'manifest.json'))).title}))));return;}
      if(u.pathname.startsWith('/api/run/')){const id=u.pathname.slice(9);if(!/^build-[a-f0-9-]+$/.test(id)||path.dirname(fs.realpathSync(path.join(root,id)))!==fs.realpathSync(root))throw Error();res.setHeader('Content-Type','application/json');res.end(JSON.stringify(require('./projection.cjs').project(path.join(root,id),{local:true})));return;}
      if(u.pathname.startsWith('/api/preview/')){const [, , ,id,candidate]=u.pathname.split('/');if(!/^build-[a-f0-9-]+$/.test(id)||!/^v[0-9]+$/.test(candidate))throw Error();const directory=fs.realpathSync(path.join(root,id));if(path.dirname(directory)!==fs.realpathSync(root))throw Error();const R=require('./runtime.cjs'),c=R.candidate(directory,candidate),render=R.S.readRun(directory).events.findLast(e=>e.type==='render.completed'&&e.candidateId===candidate&&e.details.specification===c.sha256);if(!render)throw Error();const file=fs.realpathSync(path.join(directory,render.details.artifactPath));if(path.relative(directory,file).startsWith('..'))throw Error();const bytes=fs.readFileSync(file);if(R.sha(bytes)!==render.details.sha256)throw Error();res.setHeader('Content-Type','image/svg+xml');res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; sandbox");res.end(bytes);return;}
      if(/^\/fonts\/geist-(sans|mono|pixel)\.woff2$/.test(u.pathname)){res.setHeader('Content-Type','font/woff2');res.end(fs.readFileSync(path.join(ROOT,'maze-harness/site/assets',u.pathname.slice(1))));return;}
      const routes={'/':'shared/local.html','/exhibition.css':'shared/exhibition.css','/process.js':'shared/process.js','/local.js':'shared/local.js'};
      const file=routes[u.pathname];if(!file){res.writeHead(404).end();return;}
      res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(path.join(ROOT,file)));
    }catch{res.writeHead(404).end('Evidence unavailable');}
  });
  server.listen(0,'127.0.0.1',()=>fs.writeFileSync(path.join(root,'viewer.json'),JSON.stringify({pid:process.pid,url:`http://127.0.0.1:${server.address().port}`})));
}
module.exports={ensure};
