// Simple test file to check if Node.js is working
console.log('Node.js is working!');

// Write to a file to check file system access
const fs = require('fs');
try {
    fs.writeFileSync('test-output.txt', 'Test successful: ' + new Date().toString());
    console.log('File write successful');
} catch (err) {
    console.error('File write error:', err);
}

// Print environment information
console.log('Node.js version:', process.version);
console.log('Environment:', process.env.NODE_ENV);
console.log('Current directory:', process.cwd());
console.log('Files in directory:', fs.readdirSync('.').join(', '));

// Check if app.js exists
console.log('app.js exists:', fs.existsSync('app.js'));
console.log('server.js exists:', fs.existsSync('server.js'));
console.log('index.js exists:', fs.existsSync('index.js'));
