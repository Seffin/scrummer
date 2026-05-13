import { json, type Handle } from '@sveltejs/kit';
import { authService } from '$lib/server/auth';
import { initializeDatabase } from '$lib/db/turso';

// Auto-initialize database on startup (idempotent)
initializeDatabase().catch(err => {
  console.error('CRITICAL: Failed to initialize database schema:', err);
});

export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname.startsWith('/api/')) {
    // Unprotected paths
    const publicPaths = [
      '/api/auth/login',
      '/api/auth/login-email',
      '/api/auth/login-google',
      '/api/auth/register',
      '/api/github/cli/check',
      '/api/github/cli/token',
      '/api/github/cli/user',
      '/api/github/cli/orgs',
      '/api/github/cli/repos'
    ];
    
    const isPublicPath = publicPaths.some(path => event.url.pathname === path || event.url.pathname.startsWith(path + '/'));
    
    if (!isPublicPath) {
      const user = await authService.authenticateRequest(event.request);
      if (!user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
      }
      event.locals.user = user;
    }
  }

  // Handle CORS
  if (event.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }

  const response = await resolve(event);
  
  if (event.url.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
  }

  return response;
};
