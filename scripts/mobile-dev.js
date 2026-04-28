#!/usr/bin/env node

/**
 * Mobile Development Setup Script
 * Makes it easy to run the app for mobile testing
 */

const { exec } = require('child_process');
const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip over internal (i.e., 127.0.0.1) and non-ipv4 addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return 'localhost';
}

console.log('🚀 Starting Mobile Development Setup...\n');

const localIP = getLocalIP();
const port = 5173;

console.log(`📱 Your Local IP: ${localIP}`);
console.log(`🔗 Mobile URL: http://${localIP}:${port}`);
console.log(`💻 Desktop URL: http://localhost:${port}\n`);

console.log('📋 Next Steps:');
console.log('1. Ensure your mobile device is on the same WiFi network');
console.log('2. Open the Mobile URL on your mobile browser');
console.log('3. Start testing!\n');

console.log('🛑 Press Ctrl+C to stop the server\n');

// Start the dev server with host flag
const devServer = exec(`bun run dev --host --port ${port}`, {
  stdio: 'inherit'
});

devServer.on('close', (code) => {
  console.log(`\n👋 Development server stopped (code: ${code})`);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development server...');
  devServer.kill('SIGINT');
});
