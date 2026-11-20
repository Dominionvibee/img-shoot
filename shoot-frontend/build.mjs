import { cp, mkdir, rm } from 'node:fs/promises';
const out = new URL('./dist/', import.meta.url);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const item of ['index.html', 'src', 'data']) await cp(new URL(`./${item}`, import.meta.url), new URL(`./dist/${item}`, import.meta.url), { recursive: true });
console.log('Static build written to dist/');
