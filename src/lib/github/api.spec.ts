import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	githubFetch,
	githubGet,
	githubPost,
	githubPatch,
	githubPut,
	githubDelete,
	getUserRepos,
	getUserOrgs,
	getUserProfile,
	getRepoIssues,
	GitHubAuthError,
	GitHubNotFoundError
} from './api';
import * as githubAuth from './auth';

vi.mock('./auth', () => ({
	getGitHubToken: vi.fn()
}));

describe('GitHub API Client', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal('fetch', vi.fn());	
	});

	describe('buildHeaders (implicit in githubFetch)', () => {
		it('should throw error if no token stored', async () => {
			vi.mocked(githubAuth.getGitHubToken).mockReturnValue(null);

			await expect(githubFetch('/user')).rejects.toThrow(
				'No GitHub token found. Please authenticate first.'
			);
		});

		it('should include Authorization: Bearer <token> header', async () => {
			vi.mocked(githubAuth.getGitHubToken).mockReturnValue('ghp_test123');
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ login: 'testuser' })
			});

			await githubFetch('/user');

			expect(global.fetch).toHaveBeenCalledWith(
				'https://api.github.com/user',
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer ghp_test123'
					})
				})
			);
		});
	});

	describe('githubFetch()', () => {
		beforeEach(() => {
			vi.mocked(githubAuth.getGitHubToken).mockReturnValue('ghp_test123');
		});

		it('should throw GitHubAuthError on 401 response', async () => {
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: false,
				status: 401,
				json: async () => ({ message: 'Bad credentials' })
			} as unknown as Response);

			await expect(githubFetch('/user')).rejects.toThrow(GitHubAuthError);
		});

		it('should throw GitHubNotFoundError on 404 response', async () => {
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: false,
				status: 404,
				json: async () => ({ message: 'Not Found' })
			});

			await expect(githubFetch('/repos/invalid/repo')).rejects.toThrow(
				GitHubNotFoundError
			);
		});

		it('should throw error on non-OK response (throwOnError = true)', async () => {
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: async () => ({ message: 'Internal Server Error' })
			} as unknown as Response);

			await expect(githubFetch('/user')).rejects.toThrow();
		});

		it('should not throw error on non-OK response when throwOnError = false', async () => {
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: async () => ({ message: 'Internal Server Error' })
			});

			const result = await githubFetch('/user', { throwOnError: false });
			expect(result).toBeDefined();
		});

		it('should return parsed JSON on success', async () => {
			const mockData = { login: 'testuser', id: 123 };
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockData
			});

			const result = await githubFetch('/user');
			expect(result).toEqual(mockData);
		});

		it('should merge custom headers with default headers', async () => {
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({})
			});

			await githubFetch('/user', {
				headers: { 'X-Custom': 'value' }
			});

			expect(global.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer ghp_test123',
						'X-Custom': 'value'
					})
				})
			);
		});
	});

	describe('HTTP verb methods', () => {
		beforeEach(() => {
			vi.mocked(githubAuth.getGitHubToken).mockReturnValue('ghp_test123');
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({})
			});
		});

		it('githubGet() should make GET request with token', async () => {
			await githubGet('/user/repos');

			expect(global.fetch).toHaveBeenCalledWith(
				'https://api.github.com/user/repos',
				expect.objectContaining({ method: 'GET' })
			);
		});

		it('githubPost() should make POST request with JSON body and token', async () => {
			const body = { name: 'test' };
			await githubPost('/repos/owner/repo/issues', body);

			expect(global.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify(body)
				})
			);
		});

		it('githubPatch() should make PATCH request with JSON body and token', async () => {
			const body = { state: 'closed' };
			await githubPatch('/repos/owner/repo/issues/1', body);

			expect(global.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'PATCH',
					body: JSON.stringify(body)
				})
			);
		});

		it('githubPut() should make PUT request with JSON body and token', async () => {
			const body = { starred: true };
			await githubPut('/user/starred/owner/repo', body);

			expect(global.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'PUT',
					body: JSON.stringify(body)
				})
			);
		});

		it('githubDelete() should make DELETE request with token', async () => {
			await githubDelete('/repos/owner/repo/subscription');

			expect(global.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ method: 'DELETE' })
			);
		});
	});

	describe('Convenience methods', () => {
		beforeEach(() => {
			vi.mocked(githubAuth.getGitHubToken).mockReturnValue('ghp_test123');
		});

		it('getUserRepos() should call /user/repos endpoint', async () => {
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => []
			});

			await getUserRepos();

			expect(global.fetch).toHaveBeenCalledWith(
				'https://api.github.com/user/repos?per_page=100',
				expect.any(Object)
			);
		});

		it('getUserOrgs() should call /user/orgs endpoint', async () => {
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => []
			});

			await getUserOrgs();

			expect(global.fetch).toHaveBeenCalledWith(
				'https://api.github.com/user/orgs?per_page=100',
				expect.any(Object)
			);
		});

		it('getUserProfile() should call /user endpoint', async () => {
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({})
			});

			await getUserProfile();

			expect(global.fetch).toHaveBeenCalledWith(
				'https://api.github.com/user',
				expect.any(Object)
			);
		});

		it('getRepoIssues() should call /repos/{owner}/{repo}/issues endpoint', async () => {
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => []
			});

			await getRepoIssues('torvalds', 'linux');

			expect(global.fetch).toHaveBeenCalledWith(
				'https://api.github.com/repos/torvalds/linux/issues?per_page=100&state=all',
				expect.any(Object)
			);
		});

		it('getRepoIssues() should URL-encode owner and repo', async () => {
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => []
			});

			await getRepoIssues('owner/with-special', 'repo name');

			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('owner%2Fwith-special'),
				expect.any(Object)
			);
		});
	});

	describe('Error types', () => {
		it('GitHubAuthError should have statusCode property', () => {
			const error = new GitHubAuthError('Unauthorized', 401);
			expect(error.statusCode).toBe(401);
			expect(error.message).toBe('Unauthorized');
			expect(error.name).toBe('GitHubAuthError');
		});

		it('GitHubNotFoundError should have statusCode property', () => {
			const error = new GitHubNotFoundError('Not found', 404);
			expect(error.statusCode).toBe(404);
			expect(error.message).toBe('Not found');
			expect(error.name).toBe('GitHubNotFoundError');
		});
	});
});
