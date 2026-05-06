import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthStore } from './auth.svelte.ts';

// Mock browser environment
vi.mock('$app/environment', () => ({
    browser: true
}));

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);
mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

describe('Auth Store', () => {
    let auth: ReturnType<typeof createAuthStore>;

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        auth = createAuthStore();
    });

    it('should initialize as not authenticated', () => {
        expect(auth.isAuthenticated).toBe(false);
        expect(auth.user).toBe(null);
    });

    it('should login with email and password', async () => {
        const mockUser = { id: 1, email: 'tom@example.com', username: 'Tom' };
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ user: mockUser, access_token: 'fake-jwt' })
        });

        await auth.loginEmail('tom@example.com', 'password123');

        expect(auth.isAuthenticated).toBe(true);
        expect(auth.user?.email).toBe('tom@example.com');
        expect(localStorage.getItem('auth_token')).toBe('fake-jwt');
    });

    it('should handle login error', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Invalid credentials' })
        });

        await auth.loginEmail('tom@example.com', 'wrong');

        expect(auth.isAuthenticated).toBe(false);
        expect(auth.error).toBe('Invalid credentials');
    });

    it('should logout and clear storage', () => {
        auth.setToken('some-token');
        auth.logout();

        expect(auth.isAuthenticated).toBe(false);
        expect(localStorage.getItem('auth_token')).toBe(null);
    });
});
