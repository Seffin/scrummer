import { browser } from '$app/environment';

const BASE = () => {
	return '/api';
};

export async function apiFetch<T>(
	path: string,
	options: RequestInit = {}
): Promise<T> {
	let token = null;
	if (browser) {
		token = localStorage.getItem('auth_token');
	}
	const res = await fetch(`${BASE()}${path}`, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...options.headers
		}
	});

	if (res.status === 401) {
		console.warn('[API] Unauthorized, logging out...');
		if (browser) {
			localStorage.removeItem('auth_token');
			localStorage.removeItem('auth_user');
			window.location.href = '/login';
		}
		throw new Error('SESSION_EXPIRED');
	}

	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		const error = new Error(body.error || body.message || `HTTP ${res.status}`);
		(error as any).status = res.status;
		(error as any).data = body;
		throw error;
	}

	if (res.status === 204) return undefined as T;
	return res.json() as Promise<T>;
}
