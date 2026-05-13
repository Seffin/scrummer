import { createClient } from '@libsql/client';
const client = createClient({ url: 'file:local.db' });
async function run() {
  const rs = await client.execute('SELECT id, username, github_token FROM users;');
  console.log(rs.rows);
}
run();
