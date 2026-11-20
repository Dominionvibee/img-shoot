import { access, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const apps = [
  { name: 'frontend', directory: 'shoot-frontend' },
  { name: 'backend', directory: 'shoot-backend' },
];
const children = [];
let stopping = false;

async function hasDevScript(directory) {
  const packagePath = resolve(root, directory, 'package.json');
  try {
    await access(packagePath);
    const appPackage = JSON.parse(await readFile(packagePath, 'utf8'));
    return typeof appPackage.scripts?.dev === 'string';
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) {
    if (child.exitCode === null) child.kill('SIGTERM');
  }
}

for (const app of apps) {
  if (!await hasDevScript(app.directory)) {
    console.warn(`[dev] ${app.name} is not initialized yet; skipping ${app.directory}.`);
    continue;
  }

  const npmCli = process.env.npm_execpath;
  const command = npmCli ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const args = npmCli
    ? [npmCli, 'run', 'dev', '--prefix', app.directory]
    : ['run', 'dev', '--prefix', app.directory];
  const child = spawn(command, args, {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
    shell: !npmCli && process.platform === 'win32',
  });
  children.push(child);
  child.on('error', error => {
    console.error(`[dev] Could not start ${app.name}: ${error.message}`);
    stop(1);
  });
  child.on('exit', (code, signal) => {
    if (!stopping) {
      const exitCode = code ?? (signal ? 1 : 0);
      stop(exitCode);
    }
  });
}

if (children.length === 0) {
  console.error('[dev] No initialized application has a development script.');
  process.exitCode = 1;
} else {
  process.on('SIGINT', () => stop(0));
  process.on('SIGTERM', () => stop(0));
}
