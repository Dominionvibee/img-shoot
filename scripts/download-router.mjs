import{writeFile}from'node:fs/promises';
for(const[name,url]of[
 ['remix-router.js','https://unpkg.com/@remix-run/router@1.23.0/dist/router.umd.min.js'],
 ['react-router.js','https://unpkg.com/react-router@6.30.1/dist/umd/react-router.production.min.js'],
 ['react-router-dom.js','https://unpkg.com/react-router-dom@6.30.1/dist/umd/react-router-dom.production.min.js'],
]){const r=await fetch(url);if(!r.ok)throw new Error(`${name}: ${r.status}`);await writeFile('shoot-frontend/assets/original/'+name,await r.text());console.log(name);}
