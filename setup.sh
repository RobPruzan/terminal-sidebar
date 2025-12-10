#!/bin/bash

# Setup script for terminal-sidebar server auto-start

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_PATH="$SCRIPT_DIR/server/server.js"

# Determine shell config file
if [ -n "$ZSH_VERSION" ] || [ -f "$HOME/.zshrc" ]; then
  SHELL_RC="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ] || [ -f "$HOME/.bashrc" ]; then
  SHELL_RC="$HOME/.bashrc"
else
  echo "Could not detect shell config file. Please add manually:"
  echo ""
  echo '(pgrep -f "terminal-sidebar/server/server.js" > /dev/null || nohup node "'"$SERVER_PATH"'" > /dev/null 2>&1 &)'
  exit 1
fi

# Check if already configured
if grep -q "terminal-sidebar/server/server.js" "$SHELL_RC" 2>/dev/null; then
  echo "Terminal server auto-start already configured in $SHELL_RC"
  exit 0
fi

# Add to shell config
echo "" >> "$SHELL_RC"
echo "# Obsidian terminal server daemon" >> "$SHELL_RC"
echo "(pgrep -f \"terminal-sidebar/server/server.js\" > /dev/null || nohup node \"$SERVER_PATH\" > /dev/null 2>&1 &)" >> "$SHELL_RC"

echo "Added terminal server auto-start to $SHELL_RC"
echo ""
echo "To start the server now, run:"
echo "  source $SHELL_RC"
echo ""
echo "Or manually:"
echo "  node $SERVER_PATH &"
