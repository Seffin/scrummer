import { apiFetch } from './client';
import type { User } from '$lib/stores/auth.svelte';

export interface AuthResponse {
	access_token: string;
	user: User;
}

export const authApi = {
	me: () => 
		apiFetch<{ user: User }>('/auth/me'),

	register: (body: object) => 
		apiFetch<AuthResponse>('/auth/register', {
			method: 'POST',
			body: JSON.stringify(body)
		}),

	loginEmail: (body: object) => 
		apiFetch<AuthResponse>('/auth/login-email', {
			method: 'POST',
			body: JSON.stringify(body)
		}),

	loginGitHub: (body: object) => 
		apiFetch<AuthResponse>('/auth/login', {
			method: 'POST',
			body: JSON.stringify(body)
		}),

	loginGoogle: (body: object) => 
		apiFetch<AuthResponse>('/auth/login-google', {
			method: 'POST',
			body: JSON.stringify(body)
		}),

	logout: () =>
		apiFetch<void>('/auth/logout', { method: 'POST' }).catch(() => {}),

	logoutGitHub: () =>
		apiFetch<void>('/auth/github/logout', { method: 'POST' }),

	updateProfile: (body: object) =>
		apiFetch<{ user: User }>('/auth/profile', {
			method: 'PUT',
			body: JSON.stringify(body)
		})
};
