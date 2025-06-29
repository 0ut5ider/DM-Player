const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'dm_player.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.serialize(() => {
      // Enable foreign key constraints
      db.run('PRAGMA foreign_keys = ON');

      // Create users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `, (err) => {
        if (err) {
          console.error('Error creating users table', err.message);
        }
      });

      // Create sessions table
      db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating sessions table', err.message);
        }
      });

      // Create projects table with user ownership and status
      db.run(`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          user_id TEXT NOT NULL,
          status TEXT DEFAULT 'draft',
          created_at TEXT NOT NULL,
          published_at TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
          project_id TEXT NOT NULL,
          original_name TEXT NOT NULL,
          path TEXT NOT NULL,
          duration REAL NOT NULL,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
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
          project_id TEXT NOT NULL,
          time REAL NOT NULL,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
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
