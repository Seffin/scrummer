import { turso } from '../src/lib/db/turso.ts';

async function fixDuplicates() {
  console.log('🔧 Fixing duplicate users...');
  
  // Get all users
  const result = await turso.execute('SELECT * FROM users ORDER BY id');
  const users = result.rows;
  
  console.log(`📊 Total users: ${users.length}`);
  
  // Find duplicates by email and keep the one with lowest ID
  const emailMap = new Map();
  const toDelete = [];
  
  for (const user of users) {
    const email = user.email;
    if (email) {
      if (emailMap.has(email)) {
        const existing = emailMap.get(email);
        if (user.id > existing.id) {
          toDelete.push(user.id);
          console.log(`  Marking for deletion: ID ${user.id} (email: ${email}) - keeping ID ${existing.id}`);
        } else {
          toDelete.push(existing.id);
          emailMap.set(email, user);
          console.log(`  Marking for deletion: ID ${existing.id} (email: ${email}) - keeping ID ${user.id}`);
        }
      } else {
        emailMap.set(email, user);
      }
    }
  }
  
  // Delete duplicates
  for (const id of toDelete) {
    // First, delete timer_sessions that reference this user
    await turso.execute('DELETE FROM timer_sessions WHERE user_id = ?', [id]);
    console.log(`  Deleted timer_sessions for user ID ${id}`);
    
    // Then delete the user
    await turso.execute('DELETE FROM users WHERE id = ?', [id]);
    console.log(`  Deleted user ID ${id}`);
  }
  
  console.log(`\n✅ Deleted ${toDelete.length} duplicate users`);
  
  // Verify
  const finalResult = await turso.execute('SELECT * FROM users ORDER BY id');
  console.log(`📊 Final user count: ${finalResult.rows.length}`);
}

fixDuplicates().catch(console.error);
