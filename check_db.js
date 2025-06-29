const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'dm_player.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
    return;
  }
  
  console.log('Connected to the SQLite database.');
  
  // Check projects
  db.all('SELECT id, name, status, user_id FROM projects', [], (err, projects) => {
    if (err) {
      console.error('Error querying projects:', err.message);
    } else {
      console.log('Projects in database:', projects.length);
      projects.forEach(p => console.log(`- ${p.name} (${p.status}) - ID: ${p.id}`));
    }
    
    // Check tracks
    db.all('SELECT id, project_id, original_name FROM tracks', [], (err, tracks) => {
      if (err) {
        console.error('Error querying tracks:', err.message);
      } else {
        console.log('\nTracks in database:', tracks.length);
        tracks.forEach(t => console.log(`- ${t.original_name} - Project: ${t.project_id}`));
      }
      
      // Check users
      db.all('SELECT id, username FROM users', [], (err, users) => {
        if (err) {
          console.error('Error querying users:', err.message);
        } else {
          console.log('\nUsers in database:', users.length);
          users.forEach(u => console.log(`- ${u.username} - ID: ${u.id}`));
        }
        
        db.close();
      });
    });
  });
});
