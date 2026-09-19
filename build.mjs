import {build} from 'esbuild';import fs from 'node:fs';
fs.mkdirSync('docs',{recursive:true});
await build({entryPoints:['src/app.js'],bundle:true,minify:true,outfile:'docs/app.js',loader:{'.html':'text'},format:'esm',target:['safari16']});
fs.copyFileSync('src/index.html','docs/index.html');fs.copyFileSync('src/reader.css','docs/style.css');fs.writeFileSync('docs/.nojekyll','');
