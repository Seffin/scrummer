/**
 * OAuth Token Exchange Endpoint
 * Exchanges device code for access token via server-side proxy
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { storeGitHubTokenCookie } from '$lib/auth/tokenStorage';
import { env } from '$env/dynamic/private';

// Server-side OAuth configuration (kept secret)
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const CLIENT_ID = env.GITHUB_OAUTH_CLIENT_ID || env.VITE_GITHUB_DEVICE_CLIENT_ID || process.env.GITHUB_OAUTH_CLIENT_ID || process.env.VITE_GITHUB_DEVICE_CLIENT_ID || '';

interface TokenRequest {
	device_code: string;
}

interface GitHubTokenResponse {
	access_token?: string;
	token_type?: string;
	scope?: string;
	error?: string;
	error_description?: string;
}

/**
 * POST /api/github/oauth/token
 * Exchanges device code for access token
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	// Validate configuration
	if (!CLIENT_ID) {
		console.error('🔐 [OAuth Token] GITHUB_OAUTH_CLIENT_ID not configured');
		return json(
			{ error: 'oauth_not_configured', message: 'Server-side OAuth is not configured' },
			{ status: 500 }
		);
	}

	try {
		const body = await request.json() as TokenRequest;

		if (!body.device_code) {
			return json(
				{ error: 'missing_device_code', message: 'device_code is required' },
				{ status: 400 }
			);
		}

		console.log('🔐 [OAuth Token] Exchanging device code for token...');

		// Exchange device code for token
		const response = await fetch(GITHUB_TOKEN_URL, {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				client_id: CLIENT_ID,
				device_code: body.device_code,
				grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
			})
		});

		if (!response.ok) {
			console.error(`🔐 [OAuth Token] Token request failed with status: ${response.status}`);
			return json(
				{ error: 'token_request_failed', message: `Failed to exchange token (Status: ${response.status})` },
				{ status: 502 }
			);
		}

		const data = await response.json() as GitHubTokenResponse;

		// Handle OAuth errors
		if (data.error) {
			console.log('🔐 [OAuth Token] OAuth poll response:', data.error);

			// These are expected states for polling, not errors
			if (data.error === 'authorization_pending' || data.error === 'slow_down') {
				return json(
					{ error: data.error, message: data.error_description || 'Authorization pending' },
					{ status: 202 } // Accepted, continue polling
				);
			}

			if (data.error === 'expired_token') {
				return json(
					{ error: 'expired_token', message: 'Device code has expired' },
					{ status: 410 }
				);
			}

			if (data.error === 'authorization_declined') {
				return json(
					{ error: 'authorization_declined', message: 'User declined authorization' },
					{ status: 403 }
				);
			}

			return json(
				{ error: data.error, message: data.error_description || data.error },
				{ status: 400 }
			);
		}

		// Success! Store the token
		if (!data.access_token) {
			return json(
				{ error: 'no_token', message: 'No access token received' },
				{ status: 502 }
			);
		}

		console.log('🔐 [OAuth Token] Token received successfully');

		// Store token securely in cookie
		storeGitHubTokenCookie(data.access_token, cookies);

		return json({
			success: true,
			access_token: data.access_token,
			token_type: data.token_type,
			scope: data.scope
		});
	} catch (error) {
		console.error('🔐 [OAuth Token] Unexpected error:', error);
		return json(
			{ error: 'server_error', message: 'Unexpected error during token exchange' },
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/github/oauth/token
 * Logs out user by clearing the token
 */
export const DELETE: RequestHandler = async ({ cookies }) => {
	console.log('🔐 [OAuth Token] Logging out...');
	
	cookies.delete('github_token', { path: '/' });
	cookies.delete('github_token_secure', { path: '/' });
	
	return json({ success: true });
};
