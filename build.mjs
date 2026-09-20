import {build} from 'esbuild';import fs from 'node:fs';import {createHash} from 'node:crypto';
fs.mkdirSync('docs',{recursive:true});
await build({entryPoints:['src/app.js'],bundle:true,minify:true,outfile:'docs/app.js',loader:{'.html':'text'},format:'esm',target:['safari16']});
const version=createHash('sha256').update(fs.readFileSync('docs/app.js')).update(fs.readFileSync('src/reader.css')).digest('hex').slice(0,12);fs.writeFileSync('docs/index.html',fs.readFileSync('src/index.html','utf8').replace('./app.js','./app.js?v='+version).replace('./style.css','./style.css?v='+version));fs.copyFileSync('src/reader.css','docs/style.css');fs.writeFileSync('docs/.nojekyll','');
