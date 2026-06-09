const { spawn } = require('child_process');
const path = require('path');

const electronExe = path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron.exe');
const appDir = __dirname;

const child = spawn(electronExe, [appDir], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' },
  windowsHide: false,
  detached: false,
});

child.on('exit', (code) => {
  console.log('Electron exited with code:', code);
  process.exit(code || 0);
});
