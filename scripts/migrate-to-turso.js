import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseService } from '../local-server/database-turso.ts';
import { initializeDatabase } from '../src/lib/db/turso.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  console.log('🚀 Starting migration to database...');

  // Initialize database schema
  await initializeDatabase();
  console.log('✅ Database schema initialized');

  // Load existing JSON data
  const dataPath = path.join(__dirname, '../local-server/worktrack-data.json');
  let existingData = {
    users: [],
    timer_sessions: [],
    timer_events: []
  };

  if (fs.existsSync(dataPath)) {
    const content = fs.readFileSync(dataPath, 'utf-8');
    existingData = JSON.parse(content);
    console.log(`📊 Loaded existing data: ${existingData.users.length} users, ${existingData.timer_sessions.length} sessions, ${existingData.timer_events.length} events`);
  } else {
    console.log('⚠️ No existing data file found, starting fresh');
  }

  // Create database service and migrate data
  const db = new DatabaseService();
  await db.migrateFromJson(existingData);
  console.log('✅ Migration completed successfully!');

  // Backup old data file
  if (fs.existsSync(dataPath)) {
    const backupPath = dataPath.replace('.json', '.json.backup');
    fs.renameSync(dataPath, backupPath);
    console.log(`💾 Old data backed up to: ${backupPath}`);
  }

  console.log('🎉 Migration complete! Your data is now in the database.');
}

// Run migration
migrate().catch(console.error);
