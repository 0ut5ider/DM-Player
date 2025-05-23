const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'dm_player.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.serialize(() => {
      // Create users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          artistName TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          passwordHash TEXT NOT NULL,
          description TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        )
      `, (err) => {
        if (err) {
          console.error('Error creating users table', err.message);
        }
      });

      // Create projects table
      db.run(`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          name TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating projects table', err.message);
        }
      });

      // Create tracks table
      db.run(`
        CREATE TABLE IF NOT EXISTS tracks (
          id TEXT PRIMARY KEY,
          projectId TEXT NOT NULL,
          originalName TEXT NOT NULL,
          path TEXT NOT NULL,
          duration REAL NOT NULL,
          FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating tracks table', err.message);
        }
      });

      // Create cue_points table
      db.run(`
        CREATE TABLE IF NOT EXISTS cue_points (
          id TEXT PRIMARY KEY,
          projectId TEXT NOT NULL,
          time REAL NOT NULL,
          FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating cue_points table', err.message);
        }
      });
    });
  }
});

module.exports = db;
