# Terminal Sidebar for Obsidian

Embedded terminal in Obsidian's right sidebar using xterm.js.

## Features

- Full terminal emulator in the right sidebar
- Opens at your vault directory
- Command palette integration
- Ribbon icon for quick access

## Installation

### 1. Install the plugin

Copy this plugin folder to your vault's `.obsidian/plugins/` directory:

```bash
cd /path/to/your/vault/.obsidian/plugins
git clone https://github.com/RobPruzan/terminal-sidebar.git
cd terminal-sidebar
pnpm install
pnpm build
```

### 2. Install and run the terminal server

The terminal requires a local WebSocket server to handle PTY (pseudo-terminal) operations.

```bash
cd server
npm install
node server.js
```

### 3. Enable the plugin

Reload Obsidian (`Cmd+R` / `Ctrl+R`) - the plugin loads automatically from the plugins folder.

## Usage

- **Command palette**: `Ctrl/Cmd+P` → "Open terminal in right sidebar"
- **Ribbon icon**: Click the terminal icon in the left ribbon

## Auto-start server on shell startup

Add this to your `~/.zshrc` or `~/.bashrc`:

```bash
# Obsidian terminal server daemon
(pgrep -f "terminal-sidebar/server/server.js" > /dev/null || \
  nohup node "$HOME/path/to/vault/.obsidian/plugins/terminal-sidebar/server/server.js" > /dev/null 2>&1 &)
```

Replace `$HOME/path/to/vault` with the actual path to your Obsidian vault.

## Setup script

Run the included setup script to configure auto-start:

```bash
./setup.sh
```

This will add the daemon startup line to your shell config.

## Development

```bash
# Build plugin
pnpm build

# Watch mode
pnpm dev

# Run server
cd server && node server.js
```

## How it works

The plugin consists of two parts:

1. **Obsidian plugin** (`src/main.ts`): Creates a sidebar view with xterm.js embedded, connects to a local WebSocket server

2. **Terminal server** (`server/server.js`): Node.js WebSocket server using node-pty to spawn real shell processes

Since Obsidian plugins run in a sandboxed browser environment, they can't spawn shell processes directly. The separate server handles the PTY operations and communicates via WebSocket.

## License

MIT
