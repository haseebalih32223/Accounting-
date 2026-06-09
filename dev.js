const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const electronExe = path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron.exe');
const isWin = process.platform === 'win32';

// Start Vite using the correct binary for the platform
const viteCmd = isWin
  ? path.join(__dirname, 'node_modules', '.bin', 'vite.cmd')
  : path.join(__dirname, 'node_modules', '.bin', 'vite');

const vite = spawn(viteCmd, [], {
  stdio: 'inherit',
  shell: isWin,
  env: { ...process.env },
  cwd: __dirname,
});

vite.on('error', (e) => console.error('[dev] Vite error:', e.message));
vite.on('exit', (code) => { if (code !== 0) console.error('[dev] Vite exited with code', code); });

// Poll until localhost:5173 is ready, then start Electron
function waitForVite(retries) {
  if (retries === undefined) retries = 40;
  const req = http.get({ host: 'localhost', port: 5173, path: '/', timeout: 500 }, (res) => {
    console.log('[dev] Vite ready — launching Electron');
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    env.NODE_ENV = 'development';
    const electron = spawn(electronExe, ['.'], { stdio: 'inherit', env, cwd: __dirname });
    electron.on('error', (e) => console.error('[dev] Electron error:', e.message));
    electron.on('exit', () => {
      console.log('[dev] Electron closed — shutting down Vite');
      vite.kill();
      process.exit(0);
    });
  });
  req.on('error', () => {
    if (retries <= 0) { console.error('[dev] Vite not ready after timeout'); return; }
    setTimeout(() => waitForVite(retries - 1), 500);
  });
  req.on('timeout', () => req.destroy());
}

// Start polling after 1.5s to give Vite time to start
setTimeout(() => waitForVite(), 1500);

process.on('SIGINT', () => { vite.kill(); process.exit(0); });
process.on('SIGTERM', () => { vite.kill(); process.exit(0); });
