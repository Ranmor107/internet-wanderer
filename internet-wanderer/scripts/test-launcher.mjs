import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { closeSync, mkdirSync, openSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const launcherPath = join(projectRoot, '..', '一键启动.cmd');
const outputRoot = join(projectRoot, '.launcher', 'test-output');
const url = 'http://127.0.0.1:5173/';
const projectId = createHash('sha256').update(projectRoot.toLowerCase()).digest('hex');
const children = new Set();

function launch(name) {
  const stdout = openSync(join(outputRoot, `${name}.stdout.log`), 'w');
  const stderr = openSync(join(outputRoot, `${name}.stderr.log`), 'w');
  const child = spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `""${launcherPath}" --no-browser"`], {
    cwd: projectRoot, windowsHide: true, windowsVerbatimArguments: true, stdio: ['ignore', stdout, stderr],
  });
  closeSync(stdout);
  closeSync(stderr);
  children.add(child);
  return child;
}

async function ready(child, previousPid) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    assert.equal(child.exitCode, null, 'The launcher exited before the server became ready.');
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      const pid = Number(response.headers.get('X-Internet-Wanderer-Process'));
      if (response.ok && response.headers.get('X-Internet-Wanderer-Launcher') === projectId && Number.isInteger(pid) && pid > 0 && pid !== previousPid) {
        assert.equal(JSON.parse(readFileSync(join(projectRoot, '.launcher', 'start.lock'), 'utf8')).pid, pid);
        child.serverPid = pid;
        return response;
      }
    } catch { }
    await delay(250);
  }
  throw new Error('The server did not become ready within 120 seconds.');
}

async function stop(child) {
  if (child.serverPid) {
    try { process.kill(child.serverPid); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
  if (child.exitCode === null) {
    await Promise.race([new Promise((done) => child.once('exit', done)), delay(5000)]);
    if (child.exitCode === null) child.kill();
  }
  children.delete(child);
}

try {
  let occupied = false;
  try { await fetch(url, { signal: AbortSignal.timeout(1000) }); occupied = true; } catch { }
  assert.equal(occupied, false, 'Close the running application on port 5173 before testing the complete launch lifecycle.');
  mkdirSync(outputRoot, { recursive: true });
  console.log('1/3: Starting the actual double-click entry point...');
  const first = launch('first');
  assert.match(await (await ready(first)).text(), /Internet Wanderer/);
  assert.match(await (await fetch(url + 'src/main.tsx')).text(), /createRoot/, 'The current React source must be served.');
  const stampPath = join(projectRoot, 'node_modules', '.launcher-install.sha256');
  const stamp = readFileSync(stampPath, 'utf8');
  const stampTime = statSync(stampPath).mtimeMs;

  console.log('2/3: Repeated launch reuses the server and installed dependencies...');
  const repeat = launch('repeat');
  const exitCode = await Promise.race([new Promise((done) => repeat.once('exit', done)), delay(10_000).then(() => { throw new Error('Repeated launch did not finish.'); })]);
  assert.equal(exitCode, 0);
  assert.match(readFileSync(join(outputRoot, 'repeat.stdout.log'), 'utf8'), /already running/);
  assert.equal(statSync(stampPath).mtimeMs, stampTime, 'Repeated launch must not reinstall dependencies.');
  children.delete(repeat);
  console.log('3/3: A running project automatically restarts after a dependency change...');
  writeFileSync(stampPath, 'outdated-test-fingerprint');
  const restart = launch('restart');
  await ready(restart, first.serverPid);
  assert.equal(readFileSync(stampPath, 'utf8'), stamp);
  await stop(first);
  console.log('PASS: double-click entry point, current source, repeated launch, and dependency refresh.');
} catch (error) {
  console.error(`FAIL: ${error.message}\nLauncher test logs: ${outputRoot}`);
  process.exitCode = 1;
} finally {
  for (const child of children) await stop(child);
}
