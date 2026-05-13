import { DatabaseService, type User } from './database-turso.js';
import crypto from 'crypto';

const db = new DatabaseService();

export interface AuthUser {
  id: number;
  github_id?: string;
  github_token?: string;
  username: string;
  email?: string;
  avatar_url?: string;
  github_repo?: string;
}

export interface PublicAuthUser {
  id: number;
  github_id?: string;
  username: string;
  email?: string;
  avatar_url?: string;
  github_repo?: string;
  github_connected: boolean;
}

export interface LoginRequest {
  github_id?: string;
  google_id?: string;
  username: string;
  email?: string;
  avatar_url?: string;
  github_token?: string; // OAuth access token for API calls
}

import jwt from 'jsonwebtoken';
import { env } from '$env/dynamic/private';

// In serverless, we must use a real JWT, not an in-memory Map
// The secret comes from env, fallback for local testing
const JWT_SECRET = env.JWT_SECRET || 'your-jwt-secret-key';

export interface AuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export class AuthService {
  private static instance: AuthService;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  toPublicUser(user: AuthUser | User | null): PublicAuthUser | null {
    if (!user) return null;
    return {
      id: user.id,
      github_id: user.github_id,
      username: user.username,
      email: user.email,
      avatar_url: user.avatar_url,
      github_repo: user.github_repo,
      github_connected: !!user.github_token && user.github_token !== 'local_cli_authenticated',
    };
  }

  /**
   * Authenticate or create user from Google data
   */
  async authenticateGoogleUser(loginData: LoginRequest): Promise<{ user: User; tokens: AuthTokens }> {
    let user = loginData.google_id ? await db.getUserByGoogleId(loginData.google_id) : null;

    // Account Merging: If no user found by Google ID, check by Email
    if (!user && loginData.email) {
      const existingUser = await db.getUserByEmail(loginData.email);
      if (existingUser) {
        user = await db.updateUser(existingUser.id, {
          google_id: loginData.google_id,
          avatar_url: loginData.avatar_url || existingUser.avatar_url,
          username: loginData.username || existingUser.username
        });
      }
    }

    if (!user) {
      user = await db.createUser({
        google_id: loginData.google_id,
        username: loginData.username,
        email: loginData.email,
        avatar_url: loginData.avatar_url
      });
    }

    const tokens = this.generateTokens(user);
    return { user, tokens };
  }

  /**
   * Authenticate or create user from GitHub OAuth data
   */
  async authenticateUser(loginData: LoginRequest): Promise<{ user: User; tokens: AuthTokens }> {
    let user = loginData.github_id ? await db.getUserByGithubId(loginData.github_id) : null;

    if (!user && loginData.email) {
      const existingUser = await db.getUserByEmail(loginData.email);
      if (existingUser) {
        user = await db.updateUser(existingUser.id, {
          github_id: loginData.github_id,
          avatar_url: loginData.avatar_url || existingUser.avatar_url,
          username: loginData.username || existingUser.username
        });
      }
    }

    if (!user) {
      user = await db.createUser({
        github_id: loginData.github_id,
        github_username: loginData.username,
        github_token: loginData.github_token || (loginData.github_id ? 'local_cli_authenticated' : null),
        username: loginData.username,
        email: loginData.email,
        avatar_url: loginData.avatar_url,
      });
    } else {
      const updated = await db.updateUser(user.id, {
        github_username: loginData.username || user.github_username,
        avatar_url: loginData.avatar_url || user.avatar_url,
        github_token: loginData.github_token || user.github_token
      });
      if (updated) {
        user = updated;
      }
    }

    const tokens = this.generateTokens(user);
    return { user, tokens };
  }

  /**
   * Register with Email/Password
   */
  async register(email: string, password: string, username: string): Promise<{ user: User; tokens: AuthTokens }> {
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    const user = await db.createUser({
      email,
      username,
      password_hash: this.hashPassword(password)
    });

    const tokens = this.generateTokens(user);
    return { user, tokens };
  }

  /**
   * Login with Email/Password
   */
  async login(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    const user = await db.getUserByEmail(email);
    if (!user || !user.password_hash) {
      throw new Error('Invalid email or password');
    }

    const hash = this.hashPassword(password);
    if (user.password_hash !== hash) {
      throw new Error('Invalid email or password');
    }

    const tokens = this.generateTokens(user);
    return { user, tokens };
  }

  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * Update user profile data
   */
  async updateUserProfile(user: AuthUser, data: Partial<User>): Promise<User> {
    const allowedUpdates: Partial<User> = {};
    if (data.username) allowedUpdates.username = data.username;
    if (data.email) allowedUpdates.email = data.email;
    if (data.avatar_url) allowedUpdates.avatar_url = data.avatar_url;
    if (data.github_token !== undefined) allowedUpdates.github_token = data.github_token;
    if (data.github_id) allowedUpdates.github_id = data.github_id;
    if (data.github_username) allowedUpdates.github_username = data.github_username;
    if (data.google_id) allowedUpdates.google_id = data.google_id;
    if (data.github_repo) allowedUpdates.github_repo = data.github_repo;

    const updated = await db.updateUser(user.id, allowedUpdates);

    if (!updated) {
      throw new Error('User not found');
    }

    return updated;
  }

  /**
   * Verify token and return user
   */
  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      if (!decoded || !decoded.userId) return null;

      const user = await db.getUserById(decoded.userId);
      if (!user) {
        return null;
      }

      return {
        id: user.id,
        github_id: user.github_id,
        github_token: user.github_token,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        github_repo: user.github_repo,
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Generate access token
   */
  private generateTokens(user: User): AuthTokens {
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    return {
      access_token: token,
      token_type: 'Bearer',
      expires_in: 7 * 24 * 60 * 60, // 7 days in seconds
    };
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Middleware to authenticate requests
   */
  async authenticateRequest(req: Request): Promise<AuthUser | null> {
    const authHeader = req.headers.get('Authorization');
    const token = this.extractTokenFromHeader(authHeader || undefined);

    if (!token) return null;

    return await this.verifyToken(token);
  }

  /**
   * Get current user from request locals
   */
  getCurrentUser(locals: App.Locals): AuthUser {
    const user = locals.user;
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user;
  }

  /**
   * Logout user (invalidate token)
   */
  logout(token: string): void {
    // JWTs are stateless, we can't easily invalidate without a redis blacklist.
    // The client will delete the cookie.
  }

  /**
   * Revoke GitHub OAuth token globally
   */
  async revokeGitHubToken(githubToken: string): Promise<boolean> {
    if (!githubToken || githubToken === 'local_cli_authenticated') {
      return false;
    }

    try {
      const response = await fetch('https://api.github.com/applications/grants', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github+json',
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to revoke GitHub token:', error);
      return false;
    }
  }

  /**
   * Logout user with GitHub token revocation
   */
  async logoutWithGitHubRevoke(token: string, user: AuthUser): Promise<void> {
    // Revoke GitHub token if present
    if (user.github_token) {
      await this.revokeGitHubToken(user.github_token);
    }

    // Clear GitHub token from database
    await db.updateUser(user.id, { github_token: null });
  }
}

export const authService = AuthService.getInstance();