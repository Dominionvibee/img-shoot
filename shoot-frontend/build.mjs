import { cp, mkdir, readdir, rm } from 'node:fs/promises';
const out = new URL('./dist/', import.meta.url);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const item of ['index.html', 'server.mjs', 'src', 'data', 'assets']) await cp(new URL(`./${item}`, import.meta.url), new URL(`./dist/${item}`, import.meta.url), { recursive: true });
for (const item of await readdir(new URL('./public/', import.meta.url))) await cp(new URL(`./public/${item}`, import.meta.url), new URL(`./dist/${item}`, import.meta.url), { recursive: true });
console.log('Frontend and read-only snapshot server written to dist/');
