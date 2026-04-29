import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	initializeAuth,
	authenticateWithToken,
	logout,
	getAuthState,
	onAuthStateChange
} from './init';
import * as tokenStorage from './tokenStorage';

vi.mock('./tokenStorage');

describe('Auth Initialization', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('initializeAuth()', () => {
		it('should check for existing token', async () => {
			vi.mocked(tokenStorage.hasToken).mockReturnValue(false);

			await initializeAuth();

			expect(tokenStorage.hasToken).toHaveBeenCalled();
		});

		it('should set isAuthenticated: false if no token exists', async () => {
			vi.mocked(tokenStorage.hasToken).mockReturnValue(false);

			const state = await initializeAuth();

			expect(state.isAuthenticated).toBe(false);
			expect(state.error).toBeNull();
		});

		it('should validate token with GitHub API if token exists', async () => {
			vi.mocked(tokenStorage.hasToken).mockReturnValue(true);
			vi.mocked(tokenStorage.getToken).mockReturnValue('ghp_test123');
			vi.mocked(tokenStorage.validateToken).mockResolvedValueOnce(true);

			await initializeAuth();

			expect(tokenStorage.validateToken).toHaveBeenCalledWith('ghp_test123');
		});

		it('should set isAuthenticated: true if token is valid', async () => {
			vi.mocked(tokenStorage.hasToken).mockReturnValue(true);
			vi.mocked(tokenStorage.getToken).mockReturnValue('ghp_test123');
			vi.mocked(tokenStorage.validateToken).mockResolvedValueOnce(true);

			const state = await initializeAuth();

			expect(state.isAuthenticated).toBe(true);
			expect(state.error).toBeNull();
		});

		it('should set isAuthenticated: false if token is invalid', async () => {
			vi.mocked(tokenStorage.hasToken).mockReturnValue(true);
			vi.mocked(tokenStorage.getToken).mockReturnValue('ghp_invalid');
			vi.mocked(tokenStorage.validateToken).mockResolvedValueOnce(false);

			const state = await initializeAuth();

			expect(state.isAuthenticated).toBe(false);
			expect(state.error).toContain('invalid or expired');
		});

		it('should clear expired token', async () => {
			vi.mocked(tokenStorage.hasToken).mockReturnValue(true);
			vi.mocked(tokenStorage.getToken).mockReturnValue('ghp_invalid');
			vi.mocked(tokenStorage.validateToken).mockResolvedValueOnce(false);

			await initializeAuth();

			expect(tokenStorage.clearToken).toHaveBeenCalled();
		});

		it('should set isLoading: true during validation', async () => {
			vi.mocked(tokenStorage.hasToken).mockReturnValue(true);
			vi.mocked(tokenStorage.getToken).mockReturnValue('ghp_test123');
			vi.mocked(tokenStorage.validateToken).mockImplementation(
				() => new Promise((resolve) => setTimeout(() => resolve(true), 100))
			);

			// Check state immediately (before validation completes)
			const statePromise = initializeAuth();

			// Read state while loading
			expect(getAuthState().isLoading).toBe(true);

			await statePromise;
		});

		it('should set isLoading: false after validation completes', async () => {
			vi.mocked(tokenStorage.hasToken).mockReturnValue(false);

			await initializeAuth();

			expect(getAuthState().isLoading).toBe(false);
		});

		it('should handle validation errors gracefully', async () => {
			vi.mocked(tokenStorage.hasToken).mockReturnValue(true);
			vi.mocked(tokenStorage.getToken).mockReturnValue('ghp_test123');
			vi.mocked(tokenStorage.validateToken).mockRejectedValueOnce(
				new Error('Network error')
			);

			const state = await initializeAuth();

			expect(state.isAuthenticated).toBe(false);
			expect(state.error).toContain('failed');
		});
	});

	describe('authenticateWithToken()', () => {
		it('should validate token before storing', async () => {
			vi.mocked(tokenStorage.validateToken).mockResolvedValueOnce(true);

			await authenticateWithToken('ghp_test123');

			expect(tokenStorage.validateToken).toHaveBeenCalledWith('ghp_test123');
		});

		it('should store valid token', async () => {
			vi.mocked(tokenStorage.validateToken).mockResolvedValueOnce(true);

			await authenticateWithToken('ghp_test123');

			expect(tokenStorage.storeToken).toHaveBeenCalledWith('ghp_test123');
		});

		it('should set isAuthenticated: true for valid token', async () => {
			vi.mocked(tokenStorage.validateToken).mockResolvedValueOnce(true);

			const state = await authenticateWithToken('ghp_test123');

			expect(state.isAuthenticated).toBe(true);
			expect(state.error).toBeNull();
		});

		it('should reject invalid token with error message', async () => {
			vi.mocked(tokenStorage.validateToken).mockResolvedValueOnce(false);

			const state = await authenticateWithToken('ghp_invalid');

			expect(state.isAuthenticated).toBe(false);
			expect(state.error).toContain('Invalid');
		});

		it('should not store invalid token', async () => {
			vi.mocked(tokenStorage.validateToken).mockResolvedValueOnce(false);

			await authenticateWithToken('ghp_invalid');

			expect(tokenStorage.storeToken).not.toHaveBeenCalled();
		});

		it('should handle storage errors gracefully', async () => {
			vi.mocked(tokenStorage.validateToken).mockResolvedValueOnce(true);
			vi.mocked(tokenStorage.storeToken).mockImplementationOnce(() => {
				throw new Error('Storage quota exceeded');
			});

			const state = await authenticateWithToken('ghp_test123');

			expect(state.isAuthenticated).toBe(false);
			expect(state.error).toContain('Failed to store token');
		});

		it('should set isLoading: true during validation', async () => {
			vi.mocked(tokenStorage.validateToken).mockImplementation(
				() => new Promise((resolve) => setTimeout(() => resolve(true), 100))
			);

			const statePromise = authenticateWithToken('ghp_test123');

			// Read state while loading
			expect(getAuthState().isLoading).toBe(true);

			await statePromise;
		});

		it('should set isLoading: false after validation completes', async () => {
			vi.mocked(tokenStorage.validateToken).mockResolvedValueOnce(true);

			await authenticateWithToken('ghp_test123');

			expect(getAuthState().isLoading).toBe(false);
		});

		it('should handle validation errors gracefully', async () => {
			vi.mocked(tokenStorage.validateToken).mockRejectedValueOnce(
				new Error('Network error')
			);

			const state = await authenticateWithToken('ghp_test123');

			expect(state.isAuthenticated).toBe(false);
			expect(state.error).toContain('failed');
		});
	});

	describe('logout()', () => {
		it('should clear stored token', () => {
			logout();

			expect(tokenStorage.clearToken).toHaveBeenCalled();
		});

		it('should set isAuthenticated: false', () => {
			logout();

			const state = getAuthState();
			expect(state.isAuthenticated).toBe(false);
		});

		it('should set error to null', () => {
			logout();

			const state = getAuthState();
			expect(state.error).toBeNull();
		});

		it('should set isLoading: false', () => {
			logout();

			const state = getAuthState();
			expect(state.isLoading).toBe(false);
		});
	});

	describe('getAuthState()', () => {
		it('should return current auth state', async () => {
			vi.mocked(tokenStorage.hasToken).mockReturnValue(false);
			await initializeAuth();

			const state = getAuthState();

			expect(state).toMatchObject({
				isAuthenticated: false,
				isLoading: false,
				error: null
			});
		});

		it('should return a copy of state, not reference', async () => {
			vi.mocked(tokenStorage.hasToken).mockReturnValue(false);
			await initializeAuth();

			const state1 = getAuthState();
			const state2 = getAuthState();

			expect(state1).toEqual(state2);
			expect(state1).not.toBe(state2);
		});
	});

	describe('onAuthStateChange()', () => {
		it('should call callback when auth state changes', async () => {
			const callback = vi.fn();
			onAuthStateChange(callback);

			vi.mocked(tokenStorage.hasToken).mockReturnValue(true);
			vi.mocked(tokenStorage.getToken).mockReturnValue('ghp_test123');
			vi.mocked(tokenStorage.validateToken).mockResolvedValueOnce(true);

			await initializeAuth();

			expect(callback).toHaveBeenCalledWith(
				expect.objectContaining({
					isAuthenticated: true
				})
			);
		});

		it('should return unsubscribe function', async () => {
			const callback = vi.fn();
			const unsubscribe = onAuthStateChange(callback);

			expect(typeof unsubscribe).toBe('function');

			vi.mocked(tokenStorage.hasToken).mockReturnValue(false);
			await initializeAuth();

			expect(callback).toHaveBeenCalled();

			// Unsubscribe and verify no more calls
			callback.mockClear();
			unsubscribe();

			logout();

			expect(callback).not.toHaveBeenCalled();
		});

		it('should support multiple subscribers', async () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			onAuthStateChange(callback1);
			onAuthStateChange(callback2);

			vi.mocked(tokenStorage.hasToken).mockReturnValue(false);
			await initializeAuth();

			expect(callback1).toHaveBeenCalled();
			expect(callback2).toHaveBeenCalled();
		});

		it('should pass state copy to subscribers, not reference', async () => {
			const callback = vi.fn();
			onAuthStateChange(callback);

			vi.mocked(tokenStorage.hasToken).mockReturnValue(false);
			await initializeAuth();

			// Wait a tick to ensure state is fully updated
			await new Promise((resolve) => setImmediate(resolve));
			onAuthStateChange(callback);

			logout();

			expect(callback).toHaveBeenCalledWith(
				expect.objectContaining({
					isAuthenticated: false
				})
			);
		});

		it('should notify subscribers when authenticating', async () => {
			const callback = vi.fn();
			onAuthStateChange(callback);

			vi.mocked(tokenStorage.validateToken).mockResolvedValueOnce(true);

			await authenticateWithToken('ghp_test123');

			expect(callback).toHaveBeenCalledWith(
				expect.objectContaining({
					isAuthenticated: true
				})
			);
		});
	});
});
