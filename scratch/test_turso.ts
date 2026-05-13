import { createClient } from '@libsql/client';

const url = 'libsql://worktrack-db-seffin.aws-ap-south-1.turso.io';
const authToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzg1NTc3NzIsImlkIjoiMDE5ZTFhNGMtYWUwMS03MmNkLTk3NDYtMDg5ZTI1ODY3MjMzIiwicmlkIjoiZTU5ZDhkYTItZTRiOS00ZWFhLThkMTctMTM5YzVhZDUyOTcyIn0.leHZy91I2-PSZbXIWFELQJHpxsaL_799Tt4tVnzKJjEvFJx7sz3IkaRRHuEFMqjhmEpS0nY-OpHh7KQVENu5Dw';

async function testConnection() {
  console.log('🔍 Testing Turso connection...');
  const client = createClient({ url, authToken });

  try {
    const result = await client.execute('SELECT 1');
    console.log('✅ Connection successful! Result:', result.rows);
    
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('📊 Tables found:', tables.rows.map(r => r.name));
    
    if (tables.rows.some(r => r.name === 'users')) {
      const users = await client.execute("SELECT count(*) as count FROM users");
      console.log('👤 Users count:', users.rows[0].count);
    } else {
      console.log('⚠️  "users" table NOT found in the database!');
    }
  } catch (err) {
    console.error('❌ Connection failed:', err);
  }
}

testConnection();
