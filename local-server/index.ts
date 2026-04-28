import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const app = new Hono();

// CORS configuration
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    server: 'local',
    timestamp: new Date().toISOString()
  });
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
});
