import { db, User } from './database.js';
import crypto from 'crypto';

export interface AuthUser {
  id: number;
  github_id?: string;
  github_token?: string;
  username: string;
  email?: string;
  avatar_url?: string;
}

export interface LoginRequest {
  github_id?: string;
  google_id?: string;
  username: string;
  email?: string;
  avatar_url?: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Simple in-memory token store (in production, use Redis or similar)
const tokenStore = new Map<string, { userId: number; expires: Date }>();

export class AuthService {
  private static instance: AuthService;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Authenticate or create user from Google data
   */
  async authenticateGoogleUser(loginData: LoginRequest): Promise<{ user: User; tokens: AuthTokens }> {
    let user = loginData.google_id ? db.getUserByGoogleId(loginData.google_id) : null;

    // Account Merging: If no user found by Google ID, check by Email
    if (!user && loginData.email) {
      const existingUser = db.getUserByEmail(loginData.email);
      if (existingUser) {
        // Merge: Link Google ID to existing email account
        user = db.updateUser(existingUser.id, {
          google_id: loginData.google_id,
          avatar_url: loginData.avatar_url || existingUser.avatar_url,
          username: loginData.username || existingUser.username
        })!;
      }
    }

    if (!user) {
      // Create new user
      user = db.createUser({
        google_id: loginData.google_id,
        username: loginData.username,
        email: loginData.email,
        avatar_url: loginData.avatar_url,
      });
    }

    const tokens = this.generateTokens(user);
    return { user, tokens };
  }

  /**
   * Authenticate or create user from GitHub OAuth data
   */
  async authenticateUser(loginData: LoginRequest): Promise<{ user: User; tokens: AuthTokens }> {
    let user = loginData.github_id ? db.getUserByGithubId(loginData.github_id) : null;

    // Account Merging: If no user found by GitHub ID, check by Email
    if (!user && loginData.email) {
      const existingUser = db.getUserByEmail(loginData.email);
      if (existingUser) {
        // Merge: Link GitHub ID to existing email account
        user = db.updateUser(existingUser.id, {
          github_id: loginData.github_id,
          avatar_url: loginData.avatar_url || existingUser.avatar_url,
          username: loginData.username || existingUser.username
        })!;
      }
    }

    if (!user) {
      // Create new user
      user = db.createUser({
        github_id: loginData.github_id,
        github_username: loginData.username,
        github_token: loginData.github_id ? 'local_cli_authenticated' : null,
        username: loginData.username,
        email: loginData.email,
        avatar_url: loginData.avatar_url,
      });
    } else {
      // Update user with latest info
      user = db.updateUser(user.id, {
        github_username: loginData.username || user.github_username,
        avatar_url: loginData.avatar_url || user.avatar_url
      })!;
    }

    const tokens = this.generateTokens(user);
    return { user, tokens };
  }

  /**
   * Register with Email/Password
   */
  async register(email: string, password: string, username: string): Promise<{ user: User; tokens: AuthTokens }> {
    const existingUser = db.getUserByEmail(email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    const user = db.createUser({
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
    const user = db.getUserByEmail(email);
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
    // Whitelist allowed fields to prevent accidental overwrites of sensitive data like password_hash
    const allowedUpdates: Partial<User> = {};
    if (data.username) allowedUpdates.username = data.username;
    if (data.email) allowedUpdates.email = data.email;
    if (data.avatar_url) allowedUpdates.avatar_url = data.avatar_url;
    if (data.github_token) allowedUpdates.github_token = data.github_token;
    if (data.github_id) allowedUpdates.github_id = data.github_id;
    if (data.github_username) allowedUpdates.github_username = data.github_username;
    if (data.google_id) allowedUpdates.google_id = data.google_id;

    const updated = db.updateUser(user.id, allowedUpdates);

    if (!updated) {
      throw new Error('User not found');
    }

    return updated;
  }

  /**
   * Verify token and return user
   */
  verifyToken(token: string): AuthUser | null {
    const tokenData = tokenStore.get(token);
    if (!tokenData) return null;

    if (new Date() > tokenData.expires) {
      tokenStore.delete(token);
      return null;
    }

    const user = db.getUserById(tokenData.userId);
    if (!user) {
      tokenStore.delete(token);
      return null;
    }

    return {
      id: user.id,
      github_id: user.github_id,
      github_token: user.github_token,
      username: user.username,
      email: user.email,
      avatar_url: user.avatar_url,
    };
  }

  /**
   * Generate access token
   */
  private generateTokens(user: User): AuthTokens {
    // Simple token generation (in production, use proper JWT)
    const token = `token_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expires = new Date();
    expires.setDate(expires.getDate() + 7); // 7 days

    tokenStore.set(token, {
      userId: user.id,
      expires,
    });

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
  authenticateRequest(c: any): AuthUser | null {
    const authHeader = c.req.header('Authorization');
    const token = this.extractTokenFromHeader(authHeader);

    if (!token) return null;

    return this.verifyToken(token);
  }

  /**
   * Get current user from request context
   */
  getCurrentUser(c: any): AuthUser {
    const user = c.get('user');
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user;
  }

  /**
   * Logout user (invalidate token)
   */
  logout(token: string): void {
    tokenStore.delete(token);
  }
}

export const authService = AuthService.getInstance();