#!/bin/bash

# Diagnostic script for Node.js application on cPanel

echo "=== DM Player Diagnostic Script ==="
echo "Running diagnostics at $(date)"
echo

echo "=== System Information ==="
echo "Hostname: $(hostname)"
echo "Current directory: $(pwd)"
echo "User: $(whoami)"
echo

echo "=== Node.js Information ==="
echo "Node.js path: $(which node 2>/dev/null || echo 'Node.js not found in PATH')"
echo "Node.js version: $(node -v 2>/dev/null || echo 'Could not determine Node.js version')"
echo "NPM path: $(which npm 2>/dev/null || echo 'NPM not found in PATH')"
echo "NPM version: $(npm -v 2>/dev/null || echo 'Could not determine NPM version')"
echo

echo "=== Directory Contents ==="
ls -la
echo

echo "=== Application Files ==="
echo "app.js exists: $([ -f app.js ] && echo 'Yes' || echo 'No')"
echo "server.js exists: $([ -f server.js ] && echo 'Yes' || echo 'No')"
echo "index.js exists: $([ -f index.js ] && echo 'Yes' || echo 'No')"
echo "package.json exists: $([ -f package.json ] && echo 'Yes' || echo 'No')"
echo ".passenger.json exists: $([ -f .passenger.json ] && echo 'Yes' || echo 'No')"
echo ".htaccess exists: $([ -f .htaccess ] && echo 'Yes' || echo 'No')"
echo

echo "=== Configuration Files ==="
echo "=== .passenger.json ==="
if [ -f .passenger.json ]; then
    cat .passenger.json
else
    echo "File not found"
fi
echo

echo "=== package.json ==="
if [ -f package.json ]; then
    cat package.json
else
    echo "File not found"
fi
echo

echo "=== .htaccess ==="
if [ -f .htaccess ]; then
    cat .htaccess
else
    echo "File not found"
fi
echo

echo "=== Node.js Test ==="
echo "Running test.js..."
if [ -f test.js ]; then
    node test.js 2>&1 || echo "Error running test.js"
else
    echo "test.js not found"
fi
echo

echo "=== Dependencies ==="
echo "Checking node_modules..."
if [ -d node_modules ]; then
    echo "node_modules directory exists"
    echo "Number of packages: $(ls -1 node_modules | wc -l)"
    echo "Key packages:"
    for pkg in express multer uuid music-metadata; do
        echo "$pkg: $([ -d node_modules/$pkg ] && echo 'Installed' || echo 'Not installed')"
    done
else
    echo "node_modules directory not found"
fi
echo

echo "=== Error Logs ==="
echo "Checking for error logs..."
if [ -f passenger.log ]; then
    echo "Last 20 lines of passenger.log:"
    tail -20 passenger.log
else
    echo "passenger.log not found"
fi

echo "=== End of Diagnostics ==="
