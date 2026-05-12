import { turso } from '../src/lib/db/turso.ts';

async function checkDuplicates() {
  console.log('🔍 Checking for duplicate users...');
  
  // Get all users
  const result = await turso.execute('SELECT * FROM users ORDER BY email, username');
  const users = result.rows;
  
  console.log(`\n📊 Total users: ${users.length}`);
  
  // Find duplicates by email
  const emailMap = new Map();
  const duplicates = [];
  
  for (const user of users) {
    const email = user.email;
    if (email) {
      if (emailMap.has(email)) {
        duplicates.push({ type: 'email', value: email, users: [emailMap.get(email), user] });
      } else {
        emailMap.set(email, user);
      }
    }
  }
  
  // Find duplicates by username
  const usernameMap = new Map();
  for (const user of users) {
    const username = user.username;
    if (usernameMap.has(username)) {
      duplicates.push({ type: 'username', value: username, users: [usernameMap.get(username), user] });
    } else {
      usernameMap.set(username, user);
    }
  }
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicates found');
  } else {
    console.log(`\n⚠️ Found ${duplicates.length} duplicate entries:`);
    for (const dup of duplicates) {
      console.log(`\n  Duplicate by ${dup.type}: ${dup.value}`);
      for (const user of dup.users) {
        console.log(`    - ID: ${user.id}, Email: ${user.email}, Username: ${user.username}, GitHub: ${user.github_id}, Google: ${user.google_id}`);
      }
    }
  }
  
  return duplicates;
}

checkDuplicates().catch(console.error);
