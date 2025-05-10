/**
 * This is a simple wrapper around app.js for cPanel/Passenger compatibility
 * Some Passenger configurations might look for server.js instead of app.js
 */

// Simply require the main application
const app = require('./app');

// If this file is run directly, start the server
// This allows Passenger to handle the server startup if needed
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Application available at http://localhost:${PORT}/dmplayer`);
  });
}

// Export the app for Passenger
module.exports = app;
