/**
 * This is a simple wrapper around app.js for cPanel/Passenger compatibility
 * Some Passenger configurations might look for index.js as the entry point
 */

// Simply require the main application
const app = require('./app');

// Export the app for Passenger
module.exports = app;
