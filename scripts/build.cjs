#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace('<link rel="stylesheet" href="src/styles.css">',()=>'<style>\n'+fs.readFileSync(path.join(root,'src/styles.css'),'utf8')+'\n</style>');
html=html.replace(/<script src="(src\/[^\"]+\.js)"><\/script>/g,(_,file)=>'<script>\n'+fs.readFileSync(path.join(root,file),'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>');
fs.mkdirSync(path.join(root,'dist'),{recursive:true});fs.writeFileSync(path.join(root,'dist/index.html'),html);fs.writeFileSync(path.join(root,'factory-twin-offline.html'),html);console.log(`Built offline HTML (${(Buffer.byteLength(html)/1024).toFixed(1)} KB). No network dependencies.`);
