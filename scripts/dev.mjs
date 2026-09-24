import { spawn } from 'node:child_process';
import process from 'node:process';

// Windows cannot reliably spawn a .cmd shim with shell:false (Node returns
// EINVAL). npm exposes its JavaScript entry point to child scripts, so invoke
// that entry point with the current Node executable on every platform.
const npmEntry = process.env.npm_execpath;
const npmCommand = npmEntry ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm');
const npmPrefix = npmEntry ? [npmEntry] : [];
const children = [
  ['BACKEND', ['run', 'dev', '-w', 'backend']],
  ['FRONTEND', ['run', 'dev', '-w', 'frontend']],
].map(([name, args]) => {
  const child = spawn(npmCommand, [...npmPrefix, ...args], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    shell: false,
    windowsHide: false,
  });
  child.on('error', (error) => {
    console.error(`[${name}] dev process failed:`, error);
  });
  child.on('exit', (code, signal) => {
    if (code && !process.exitCode) process.exitCode = code;
    if (signal && !process.exitCode) process.exitCode = 1;
  });
  return child;
});

const shutdown = (signal) => {
  for (const child of children) child.kill(signal);
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
