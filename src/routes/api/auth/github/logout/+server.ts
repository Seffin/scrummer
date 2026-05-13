import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/server/auth';
import { DatabaseService } from '$lib/server/database-turso';

const db = new DatabaseService();

export const POST: RequestHandler = async ({ locals }) => {
  try {
    const user = authService.getCurrentUser(locals as App.Locals);
    console.log('[API] GitHub logout request received for user:', user.id);

    // Revoke GitHub token if present
    if (user.github_token && user.github_token !== 'local_cli_authenticated') {
      await authService.revokeGitHubToken(user.github_token);
      console.log('[API] GitHub token revoked from GitHub');
    }

    // Clear GitHub token from database
    const updatedUser = await db.updateUser(user.id, { github_token: null });
    if (updatedUser) {
      console.log('[API] GitHub token cleared from database');
    }

    return json({ message: 'GitHub disconnected successfully' });
  } catch (error) {
    console.error('❌ GitHub logout error:', error);
    return json({
      error: 'Failed to disconnect GitHub',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
};
