#!/usr/bin/env node
const { WebSocketServer } = require('ws');
const pty = require('node-pty');
const os = require('os');
const { URL } = require('url');

const PORT = 7681;

const wss = new WebSocketServer({ port: PORT });

console.log(`Terminal server listening on ws://localhost:${PORT}`);

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const cwd = url.searchParams.get('cwd') || process.env.HOME || process.cwd();
  const cols = parseInt(url.searchParams.get('cols')) || 80;
  const rows = parseInt(url.searchParams.get('rows')) || 24;

  console.log(`New connection: cwd="${cwd}", size=${cols}x${rows}`);

  const shell = process.env.SHELL || '/bin/zsh';

  let ptyProcess;
  try {
    ptyProcess = pty.spawn(shell, ['-l'], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        TERM_PROGRAM: 'Obsidian Terminal',
        POWERLEVEL9K_INSTANT_PROMPT: 'off',
      }
    });
  } catch (err) {
    console.error('Failed to spawn pty:', err);
    ws.close();
    return;
  }

  console.log(`PTY spawned, pid=${ptyProcess.pid}`);

  ptyProcess.onData((data) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: 'data', data }));
    }
  });

  ptyProcess.onExit(({ exitCode, signal }) => {
    console.log(`PTY exited: code=${exitCode}, signal=${signal}`);
    if (ws.readyState === ws.OPEN) {
      ws.close();
    }
  });

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message.toString());
      if (msg.type === 'data') {
        ptyProcess.write(msg.data);
      } else if (msg.type === 'resize' && msg.cols > 0 && msg.rows > 0) {
        ptyProcess.resize(msg.cols, msg.rows);
      }
    } catch (err) {
      console.error('Message error:', err);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket closed');
    try { ptyProcess.kill(); } catch (e) {}
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    try { ptyProcess.kill(); } catch (e) {}
  });
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  wss.close();
  process.exit(0);
});
