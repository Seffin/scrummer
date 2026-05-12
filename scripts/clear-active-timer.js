import { turso } from '../src/lib/db/turso.ts';

async function clearActiveTimer() {
  console.log('🧹 Clearing active timers from database...');

  try {
    // Find all active timers
    const result = await turso.execute({
      sql: "SELECT * FROM timer_sessions WHERE status = 'active'",
      args: []
    });

    const activeTimers = result.rows;

    if (activeTimers.length === 0) {
      console.log('✅ No active timers found in database');
      return;
    }

    console.log(`📊 Found ${activeTimers.length} active timer(s):`);
    for (const timer of activeTimers) {
      console.log(`  - ID: ${timer.id}, User: ${timer.user_id}, Task: ${timer.task}`);
    }

    // Update all active timers to completed
    const now = new Date().toISOString();
    for (const timer of activeTimers) {
      await turso.execute({
        sql: "UPDATE timer_sessions SET status = 'completed', end_time = ?, updated_at = ? WHERE id = ?",
        args: [now, now, timer.id]
      });
      console.log(`✅ Marked timer ${timer.id} as completed`);
    }

    console.log('🎉 All active timers have been cleared!');
  } catch (error) {
    console.error('❌ Error clearing active timers:', error);
    throw error;
  }
}

// Run the script
clearActiveTimer().catch(console.error);
