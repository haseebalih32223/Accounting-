const { spawn } = require('child_process');
const path = require('path');
const electronExe = path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron.exe');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
env.NODE_ENV = 'development';
const child = spawn(electronExe, ['.'], { stdio: 'inherit', env, cwd: __dirname });
child.on('exit', (code) => process.exit(code || 0));
