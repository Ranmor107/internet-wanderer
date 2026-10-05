import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runtimeRoot = join(projectRoot, '.launcher');
const lockPath = join(runtimeRoot, 'start.lock');
const url = 'http://127.0.0.1:5173/';
const noBrowser = process.argv.includes('--no-browser');
const hash = (text) => createHash('sha256').update(text).digest('hex');
const projectId = hash(projectRoot.toLowerCase());
let lockHandle;
let devServer;

async function isRunning() {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1000), redirect: 'error' });
    return response.ok && response.headers.get('X-Internet-Wanderer-Launcher') === projectId
      ? { pid: Number(response.headers.get('X-Internet-Wanderer-Process')) } : null;
  } catch {
    return null;
  }
}

function openBrowser() {
  if (noBrowser) return;
  const browser = spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/c', 'start', '', url], { windowsHide: true, stdio: 'ignore' });
  browser.on('error', () => console.log(`Open this address in your browser: ${url}`));
}

function runNpm(command, quiet = false) {
  const result = spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/c', command], {
    cwd: projectRoot,
    env: process.env,
    stdio: quiet ? 'ignore' : 'inherit',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  return result.status;
}

function releaseLock() {
  if (lockHandle === undefined) return;
  closeSync(lockHandle);
  rmSync(lockPath, { force: true });
  lockHandle = undefined;
}

async function start() {
  const packageText = readFileSync(join(projectRoot, 'package.json'), 'utf8');
  const packageInfo = JSON.parse(packageText);
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 12)) {
    throw new Error(`Node.js ${process.version} is too old. Install Node.js 24 or newer. Project requirement: ${packageInfo.engines?.node}`);
  }
  const cachePath = join(runtimeRoot, 'npm-cache');
  const tempPath = join(runtimeRoot, 'tmp');
  mkdirSync(cachePath, { recursive: true });
  mkdirSync(tempPath, { recursive: true });
  Object.assign(process.env, { npm_config_cache: cachePath, TEMP: tempPath, TMP: tempPath, VITE_BASE_PATH: '/' });
  const fingerprint = hash(packageText + readFileSync(join(projectRoot, 'package-lock.json'), 'utf8') + process.version + process.arch);
  const stampPath = join(projectRoot, 'node_modules', '.launcher-install.sha256');
  const installed = existsSync(stampPath) && readFileSync(stampPath, 'utf8').trim() === fingerprint;
  const dependenciesReady = installed && runNpm('npm.cmd ls --depth=0 --include=dev', true) === 0;
  const running = await isRunning();
  if (running && dependenciesReady) {
    console.log(`Internet Wanderer is already running: ${url}`);
    openBrowser();
    return;
  }
  if (running) {
    const owner = JSON.parse(readFileSync(lockPath, 'utf8'));
    if (!Number.isInteger(running.pid) || running.pid <= 0 || owner.pid !== running.pid) {
      throw new Error('Close the old project window before updating its dependencies.');
    }
    console.log('Dependencies changed. Restarting this project...');
    process.kill(running.pid);
    const deadline = Date.now() + 5000;
    while (await isRunning()) {
      if (Date.now() > deadline) throw new Error('The old project server did not stop.');
      await delay(100);
    }
  }
  try {
    lockHandle = openSync(lockPath, 'wx');
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    let previous;
    try { previous = JSON.parse(readFileSync(lockPath, 'utf8')); } catch { }
    let active = false;
    if (Number.isInteger(previous?.pid) && previous.pid > 0) {
      try { process.kill(previous.pid, 0); active = true; } catch { }
    }
    if (active) {
      console.log('Internet Wanderer is already starting. Keep the first window open.');
      return;
    }
    rmSync(lockPath, { force: true });
    lockHandle = openSync(lockPath, 'wx');
  }
  writeFileSync(lockHandle, JSON.stringify({ pid: process.pid }));

  await new Promise((done, reject) => {
    const probe = createServer();
    probe.once('error', () => reject(new Error('Port 5173 is used by another application. Close it and launch again. The fixed address preserves local favorites.')));
    probe.listen(5173, '127.0.0.1', () => probe.close(done));
  });

  if (!dependenciesReady) {
    console.log(`Preparing dependencies for Internet Wanderer (${process.version})...`);
    console.log('The first launch or a dependency update needs Internet access.');
    if (runNpm('npm.cmd ci --include=dev --no-audit --no-fund --engine-strict') !== 0) {
      throw new Error(`Dependency installation failed. Check the network and the error above. npm logs: ${join(cachePath, '_logs')}`);
    }
    writeFileSync(stampPath, fingerprint);
  }

  console.log(`Starting Internet Wanderer: ${url}`);
  console.log('Keep this window open. Press Ctrl+C or close it to stop.');
  process.chdir(projectRoot);
  const { createServer: createViteServer } = await import('vite');
  devServer = await createViteServer({
    root: projectRoot,
    base: '/',
    server: {
      host: '127.0.0.1', port: 5173, strictPort: true, open: false,
      headers: { 'X-Internet-Wanderer-Launcher': projectId, 'X-Internet-Wanderer-Process': String(process.pid) },
      watch: { ignored: ['**/.launcher/**'] },
    },
  });
  await devServer.listen();
  devServer.printUrls();
  openBrowser();
}

process.on('exit', releaseLock);
async function stop() {
  await devServer?.close();
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
try {
  await start();
} catch (error) {
  console.error(`\nStartup failed: ${error.message}`);
  process.exitCode = 1;
  await devServer?.close();
  releaseLock();
}
