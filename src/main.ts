import { Plugin, ItemView, WorkspaceLeaf } from 'obsidian';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

const VIEW_TYPE_TERMINAL = 'terminal-sidebar-view';
const WEBSOCKET_PORT = 7681;

class TerminalView extends ItemView {
  terminal: Terminal | null = null;
  fitAddon: FitAddon | null = null;
  ws: WebSocket | null = null;
  containerEl: HTMLElement;
  resizeObserver: ResizeObserver | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
    this.containerEl = this.contentEl;
  }

  getViewType(): string {
    return VIEW_TYPE_TERMINAL;
  }

  getDisplayText(): string {
    return 'Terminal';
  }

  getIcon(): string {
    return 'terminal';
  }

  async onOpen() {
    this.containerEl.empty();
    this.containerEl.addClass('terminal-sidebar-container');

    const style = document.createElement('style');
    style.textContent = `
      .terminal-sidebar-container {
        height: 100%;
        padding: 0;
        overflow: hidden;
        background: transparent;
      }
      .terminal-sidebar-container .xterm {
        height: 100%;
        padding: 8px;
      }
      .terminal-sidebar-container .xterm-viewport {
        background: transparent !important;
      }
      .terminal-sidebar-container .xterm-screen {
        background: transparent !important;
      }
    `;
    this.containerEl.appendChild(style);

    const terminalContainer = document.createElement('div');
    terminalContainer.style.height = '100%';
    terminalContainer.style.width = '100%';
    this.containerEl.appendChild(terminalContainer);

    this.terminal = new Terminal({
      theme: {
        background: '#00000000',
        foreground: '#ffffff',
        cursor: '#ffffff',
        cursorAccent: '#000000',
        selectionBackground: 'rgba(255, 255, 255, 0.3)',
        black: '#000000',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#bd93f9',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#bfbfbf',
        brightBlack: '#4d4d4d',
        brightRed: '#ff6e67',
        brightGreen: '#5af78e',
        brightYellow: '#f4f99d',
        brightBlue: '#caa9fa',
        brightMagenta: '#ff92d0',
        brightCyan: '#9aedfe',
        brightWhite: '#e6e6e6'
      },
      fontFamily: '"Cascadia Code", "SF Mono", Monaco, Inconsolata, "Roboto Mono", "Source Code Pro", monospace',
      fontSize: 12,
      lineHeight: 1.2,
      cursorBlink: true,
      allowTransparency: true,
      scrollback: 10000
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.open(terminalContainer);

    // Wait for layout to settle, then fit and connect
    setTimeout(() => {
      this.fitAddon?.fit();
      this.connectWebSocket();
      this.setupResizeObserver(terminalContainer);
    }, 50);
  }

  setupResizeObserver(container: HTMLElement) {
    let resizeTimeout: NodeJS.Timeout | null = null;

    this.resizeObserver = new ResizeObserver(() => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.fitAddon?.fit();
        if (this.ws?.readyState === WebSocket.OPEN && this.terminal) {
          this.ws.send(JSON.stringify({
            type: 'resize',
            cols: this.terminal.cols,
            rows: this.terminal.rows
          }));
        }
      }, 50);
    });
    this.resizeObserver.observe(container);
  }

  connectWebSocket() {
    if (!this.terminal) return;

    const vaultPath = (this.app.vault.adapter as any).basePath;
    const cols = this.terminal.cols;
    const rows = this.terminal.rows;
    const wsUrl = `ws://localhost:${WEBSOCKET_PORT}?cwd=${encodeURIComponent(vaultPath)}&cols=${cols}&rows=${rows}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Terminal websocket connected');
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'data') {
        this.terminal?.write(msg.data);
      }
    };

    this.ws.onclose = () => {
      console.log('Terminal websocket closed');
      this.terminal?.write('\r\n\x1b[31m[Disconnected]\x1b[0m\r\n');
    };

    this.ws.onerror = (err) => {
      console.error('Terminal websocket error:', err);
    };

    this.terminal.onData((data) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'data', data }));
      }
    });
  }

  async onClose() {
    this.ws?.close();
    this.resizeObserver?.disconnect();
    this.terminal?.dispose();
  }
}

export default class TerminalSidebarPlugin extends Plugin {
  async onload() {
    this.registerView(VIEW_TYPE_TERMINAL, (leaf) => new TerminalView(leaf));

    this.addCommand({
      id: 'open-terminal-sidebar',
      name: 'Open terminal in right sidebar',
      callback: () => this.activateView()
    });

    this.addRibbonIcon('terminal', 'Open terminal', () => this.activateView());
  }

  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_TERMINAL)[0];

    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        await rightLeaf.setViewState({ type: VIEW_TYPE_TERMINAL, active: true });
        leaf = rightLeaf;
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_TERMINAL);
  }
}
