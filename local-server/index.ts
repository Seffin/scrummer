import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono, Context, Next } from 'hono';
import { cors } from 'hono/cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import { authService } from './auth.js';
import { timerService, TimerConflictError } from './timer.js';
import { DatabaseService } from './database-turso.js';

const execAsync = promisify(exec);

const app = new Hono();

const GITHUB_API_BASE = 'https://api.github.com';

async function githubProxyFetch(path: string, githubToken: string, init: RequestInit = {}) {
  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const responseText = await response.text();
  const data = responseText ? JSON.parse(responseText) : null;

  return { response, data };
}

// CORS configuration
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Authentication middleware
const authMiddleware = async (c: Context, next: Next) => {
  const user = await authService.authenticateRequest(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  c.set('user', user);
  await next();
};

// Health check
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    server: 'local',
    timestamp: new Date().toISOString()
  });
});

// Authentication endpoints
app.post('/api/auth/register', async (c) => {
  try {
    const { email, password, username } = await c.req.json();
    const { user, tokens } = await authService.register(email, password, username);
    return c.json({ user: authService.toPublicUser(user), ...tokens });
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Registration failed' }, 400);
  }
});

app.post('/api/auth/login-email', async (c) => {
  try {
    const { email, password } = await c.req.json();
    const { user, tokens } = await authService.login(email, password);
    return c.json({ user: authService.toPublicUser(user), ...tokens });
  } catch (error) {
    console.error('Email login error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Login failed' }, 401);
  }
});

app.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.json();
    const { user, tokens } = await authService.authenticateUser(body);
    return c.json({ user: authService.toPublicUser(user), ...tokens });
  } catch (error) {
    console.error('Auth login error:', error);
    return c.json({ error: 'Authentication failed' }, 500);
  }
});

app.post('/api/auth/login-google', async (c) => {
  try {
    const body = await c.req.json();
    const { user, tokens } = await authService.authenticateGoogleUser(body);
    return c.json({ user: authService.toPublicUser(user), ...tokens });
  } catch (error) {
    console.error('Google login error:', error);
    return c.json({ error: 'Google authentication failed' }, 500);
  }
});

app.get('/api/auth/me', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as import('./auth.js').AuthUser;
    return c.json({ user: authService.toPublicUser(user) });
  } catch (error) {
    console.error('Auth me error:', error);
    return c.json({ error: 'Failed to get user info' }, 500);
  }
});

app.put('/api/auth/profile', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const updatedUser = await authService.updateUserProfile(user, body);
    const publicUser = authService.toPublicUser(updatedUser);
    if (!publicUser) {
      return c.json({ error: 'Failed to update profile' }, 500);
    }
    return c.json({ user: publicUser });
  } catch (error) {
    console.error('Update profile error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Update failed' }, 500);
  }
});

app.post('/api/auth/logout', authMiddleware, async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    console.log('[API] Logout request received');
    const token = authService.extractTokenFromHeader(authHeader);
    const user = c.get('user');

    if (token && user) {
      await authService.logoutWithGitHubRevoke(token, user);
      console.log('[API] Token and GitHub token revoked successfully');
    }

    return c.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('❌ Auth logout error:', error);
    return c.json({
      error: 'Failed to logout',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

app.post('/api/auth/github/logout', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    console.log('[API] GitHub logout request received for user:', user.id);

    // Revoke GitHub token if present
    if (user.github_token && user.github_token !== 'local_cli_authenticated') {
      await authService.revokeGitHubToken(user.github_token);
      console.log('[API] GitHub token revoked from GitHub');
    }

    // Clear GitHub token from database
    const updatedUser = db.updateUser(user.id, { github_token: null });
    if (updatedUser) {
      console.log('[API] GitHub token cleared from database');
    }

    return c.json({ message: 'GitHub disconnected successfully' });
  } catch (error) {
    console.error('❌ GitHub logout error:', error);
    return c.json({
      error: 'Failed to disconnect GitHub',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

app.get('/api/github/auth/status', authMiddleware, async (c) => {
  const user = c.get('user');
  const connected = !!user.github_token && user.github_token !== 'local_cli_authenticated';
  return c.json({ connected });
});

app.get('/api/github/user', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user.github_token || user.github_token === 'local_cli_authenticated') {
      return c.json({ error: 'GitHub is not connected for this account' }, 409);
    }
    const { response, data } = await githubProxyFetch('/user', user.github_token);
    return c.json(data, response.status as any);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'GitHub proxy failed' }, 500);
  }
});

app.get('/api/github/orgs', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user.github_token || user.github_token === 'local_cli_authenticated') {
      return c.json({ error: 'GitHub is not connected for this account' }, 409);
    }
    const { response, data } = await githubProxyFetch('/user/orgs?per_page=100', user.github_token);
    return c.json(data, response.status as any);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'GitHub proxy failed' }, 500);
  }
});

app.get('/api/github/repos', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user.github_token || user.github_token === 'local_cli_authenticated') {
      return c.json({ error: 'GitHub is not connected for this account' }, 409);
    }
    const owner = c.req.query('owner');
    if (!owner) {
      const { response, data } = await githubProxyFetch('/user/repos?per_page=100', user.github_token);
      return c.json(data, response.status as any);
    }

    // Owner can be either a user or an org. Try user repos first, then fallback to org repos.
    const userReposPath = `/users/${encodeURIComponent(owner)}/repos?per_page=100`;
    const userReposResult = await githubProxyFetch(userReposPath, user.github_token);
    if (userReposResult.response.ok) {
      return c.json(userReposResult.data, userReposResult.response.status as any);
    }

    const orgReposPath = `/orgs/${encodeURIComponent(owner)}/repos?per_page=100`;
    const orgReposResult = await githubProxyFetch(orgReposPath, user.github_token);
    return c.json(orgReposResult.data, orgReposResult.response.status as any);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'GitHub proxy failed' }, 500);
  }
});

app.get('/api/github/issues', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const owner = c.req.query('owner');
    const repo = c.req.query('repo');
    if (!owner || !repo) {
      return c.json({ error: 'owner and repo are required' }, 400);
    }
    if (!user.github_token || user.github_token === 'local_cli_authenticated') {
      return c.json({ error: 'GitHub is not connected for this account' }, 409);
    }
    const issuesPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?per_page=100&state=all`;
    const { response, data } = await githubProxyFetch(issuesPath, user.github_token);
    return c.json(data, response.status as any);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'GitHub proxy failed' }, 500);
  }
});

app.post('/api/github/issues/create', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const owner = body.owner as string | undefined;
    const repo = body.repo as string | undefined;
    const title = body.title as string | undefined;
    const issueBody = body.body as string | undefined;
    if (!owner || !repo || !title) {
      return c.json({ error: 'owner, repo and title are required' }, 400);
    }
    if (!user.github_token || user.github_token === 'local_cli_authenticated') {
      return c.json({ error: 'GitHub is not connected for this account' }, 409);
    }
    const createPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`;
    const { response, data } = await githubProxyFetch(createPath, user.github_token, {
      method: 'POST',
      body: JSON.stringify({ title, body: issueBody }),
    });
    return c.json(data, response.status as any);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'GitHub proxy failed' }, 500);
  }
});

// Timer endpoints
app.get('/api/timer/active', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const activeTimer = await timerService.getActiveTimer(user);
    console.log('[API] /api/timer/active - user:', user.id, 'activeTimer:', activeTimer);
    return c.json({ timer: activeTimer });
  } catch (error) {
    console.error('Get active timer error:', error);
    return c.json({ error: 'Failed to get active timer' }, 500);
  }
});

app.post('/api/timer/start', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const timer = await timerService.startTimer(user, body);
    return c.json({ timer });
  } catch (error) {
    console.error('Start timer error:', error);
    if (error instanceof Error && 'type' in error && error.type === 'CONFLICT') {
      const conflictError = error as TimerConflictError;
      return c.json({
        error: 'Timer conflict',
        message: 'You already have an active timer',
        conflicting_timer: conflictError.conflictingSession
      }, 409);
    }
    return c.json({ error: error instanceof Error ? error.message : 'Failed to start timer' }, 500);
  }
});

app.post('/api/timer/:id/pause', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const sessionId = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const timer = await timerService.pauseTimer(user, sessionId, body.device_info || {});
    return c.json({ timer });
  } catch (error) {
    console.error('Pause timer error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Failed to pause timer' }, 500);
  }
});

app.post('/api/timer/:id/resume', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const sessionId = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const timer = await timerService.resumeTimer(user, sessionId, body.device_info || {});
    return c.json({ timer });
  } catch (error) {
    console.error('Resume timer error:', error);
    if (error instanceof Error && 'type' in error && error.type === 'CONFLICT') {
      const conflictError = error as TimerConflictError;
      return c.json({
        error: 'Timer conflict',
        message: 'You already have another active timer',
        conflicting_timer: conflictError.conflictingSession
      }, 409);
    }
    return c.json({ error: error instanceof Error ? error.message : 'Failed to resume timer' }, 500);
  }
});

app.post('/api/timer/:id/complete', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const sessionId = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const timer = await timerService.completeTimer(user, sessionId, body.device_info || {});
    return c.json({ timer });
  } catch (error) {
    console.error('Complete timer error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Failed to complete timer' }, 500);
  }
});

app.delete('/api/timer/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const sessionId = parseInt(c.req.param('id'));
    const body = await c.req.json();
    await timerService.discardTimer(user, sessionId, body.device_info || {});
    return c.json({ message: 'Timer discarded successfully' });
  } catch (error) {
    console.error('Discard timer error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Failed to discard timer' }, 500);
  }
});

app.get('/api/timer/sessions', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const limit = parseInt(c.req.query('limit') || '50');
    const sessions = await timerService.getTimerSessions(user, limit);
    return c.json({ sessions });
  } catch (error) {
    console.error('Get timer sessions error:', error);
    return c.json({ error: 'Failed to get timer sessions' }, 500);
  }
});

app.get('/api/timer/:id/events', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const sessionId = parseInt(c.req.param('id'));
    const events = await timerService.getTimerEvents(user, sessionId);
    return c.json({ events });
  } catch (error) {
    console.error('Get timer events error:', error);
    return c.json({ error: 'Failed to get timer events' }, 500);
  }
});

// Check if GitHub CLI is available on this device
app.post('/api/github/cli/check', async (c) => {
  try {
    const { stdout } = await execAsync('gh --version', { timeout: 5000 });
    return c.json({ 
      available: true,
      version: stdout.trim(),
      device: process.platform
    });
  } catch (error) {
    return c.json({ 
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 400);
  }
});

// Get token from device's GitHub CLI
app.post('/api/github/cli/token', async (c) => {
  try {
    const { stdout } = await execAsync('gh auth token', { timeout: 10000 });
    const token = stdout.trim();
    
    if (!token) {
      return c.json(
        { message: 'No token found. Please run `gh auth login` first.' },
        { status: 401 }
      );
    }
    
    return c.json({ 
      token,
      source: 'local-cli',
      device: process.platform
    });
  } catch (error) {
    console.error('GitHub CLI token error:', error);
    
    if (error instanceof Error && error.message.includes('not logged in')) {
      return c.json(
        { message: 'Not authenticated with GitHub CLI. Please run `gh auth login` first.' },
        { status: 401 }
      );
    }
    
    return c.json(
      { message: 'Failed to get token from GitHub CLI. Please ensure you are authenticated with `gh auth login`.' },
      { status: 500 }
    );
  }
});

// Get GitHub user info from device's GitHub CLI
app.post('/api/github/cli/user', async (c) => {
  try {
    const { stdout } = await execAsync('gh api user', { timeout: 10000 });
    const user = JSON.parse(stdout);
    
    return c.json({ 
      user,
      source: 'local-cli',
      device: process.platform
    });
  } catch (error) {
    console.error('GitHub CLI user error:', error);
    return c.json(
      { message: 'Failed to get user info from GitHub CLI.' },
      { status: 500 }
    );
  }
});

// Get user organizations from device's GitHub CLI
app.post('/api/github/cli/orgs', async (c) => {
  try {
    const { stdout } = await execAsync('gh api user/orgs', { timeout: 15000 });
    const orgs = JSON.parse(stdout);
    
    return c.json({ 
      orgs,
      source: 'local-cli',
      device: process.platform
    });
  } catch (error) {
    console.error('GitHub CLI orgs error:', error);
    return c.json(
      { message: 'Failed to get organizations from GitHub CLI.' },
      { status: 500 }
    );
  }
});

// Get user repositories from device's GitHub CLI
app.post('/api/github/cli/repos', async (c) => {
  try {
    const { stdout } = await execAsync('gh api user/repos --paginated', { timeout: 15000 });
    const repos = JSON.parse(stdout);
    
    return c.json({ 
      repos,
      source: 'local-cli',
      device: process.platform
    });
  } catch (error) {
    console.error('GitHub CLI repos error:', error);
    return c.json(
      { message: 'Failed to get repositories from GitHub CLI.' },
      { status: 500 }
    );
  }
});

// Get repository issues from device's GitHub CLI
app.post('/api/github/cli/issues/:owner/:repo', async (c) => {
  const { owner, repo } = c.req.param();
  
  try {
    const { stdout } = await execAsync(`gh api repos/${owner}/${repo}/issues`, { timeout: 15000 });
    const issues = JSON.parse(stdout);
    
    return c.json({ 
      issues,
      source: 'local-cli',
      device: process.platform,
      owner,
      repo
    });
  } catch (error) {
    console.error('GitHub CLI issues error:', error);
    return c.json(
      { message: `Failed to get issues for ${owner}/${repo} from GitHub CLI.` },
      { status: 500 }
    );
  }
});

const port = 3001;
console.log(`🚀 Local GitHub CLI Server starting on port ${port}`);
console.log(`📱 This server provides per-device GitHub CLI integration`);
console.log(`🔗 Health check: http://localhost:${port}/health`);

serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0'
});
