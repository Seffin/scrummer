import { db, User } from './database.js';

export interface AuthUser {
  id: number;
  github_id: string;
  username: string;
  email?: string;
  avatar_url?: string;
}

export interface LoginRequest {
  github_id: string;
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
   * Authenticate or create user from GitHub OAuth data
   */
  async authenticateUser(loginData: LoginRequest): Promise<{ user: User; tokens: AuthTokens }> {
    let user = db.getUserByGithubId(loginData.github_id);

    if (!user) {
      // Create new user
      user = db.createUser({
        github_id: loginData.github_id,
        username: loginData.username,
        email: loginData.email,
        avatar_url: loginData.avatar_url,
      });
    } else {
      // Update user info if changed
      const updates: Partial<User> = {};
      if (user.username !== loginData.username) updates.username = loginData.username;
      if (user.email !== loginData.email) updates.email = loginData.email;
      if (user.avatar_url !== loginData.avatar_url) updates.avatar_url = loginData.avatar_url;

      if (Object.keys(updates).length > 0) {
        user = db.updateUser(user.id, updates)!;
      }
    }

    const tokens = this.generateTokens(user);
    return { user, tokens };
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