/**
 * OAuth Device Code Endpoint
 * Initiates GitHub OAuth Device Flow via server-side proxy
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Server-side OAuth configuration (kept secret)
const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code';
const CLIENT_ID = process.env.GITHUB_OAUTH_CLIENT_ID || '';
const SCOPES = process.env.GITHUB_OAUTH_SCOPES || 'repo read:org';

/**
 * POST /api/github/oauth/device-code
 * Initiates the OAuth device flow by requesting a device code from GitHub
 */
export const POST: RequestHandler = async ({ request }) => {
	// Validate configuration
	if (!CLIENT_ID) {
		console.error('🔐 [OAuth Server] GITHUB_OAUTH_CLIENT_ID not configured');
		return json(
			{ error: 'OAuth not configured', message: 'Server-side OAuth is not configured' },
			{ status: 500 }
		);
	}

	try {
		// Extract scopes from request or use default
		let scopes = SCOPES;
		try {
			const body = await request.json();
			if (body.scopes) {
				scopes = body.scopes;
			}
		} catch {
			// Use default scopes
		}

		console.log('🔐 [OAuth Server] Initiating device flow...');

		// Request device code from GitHub
		const response = await fetch(GITHUB_DEVICE_CODE_URL, {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				client_id: CLIENT_ID,
				scope: scopes
			})
		});

		if (!response.ok) {
			const text = await response.text();
			console.error('🔐 [OAuth Server] Device code request failed:', response.status, text);
			return json(
				{ error: 'device_flow_failed', message: `Failed to initiate device flow: ${response.statusText}` },
				{ status: 502 }
			);
		}

		const data = await response.json();

		// Check for OAuth errors
		if (data.error) {
			console.error('🔐 [OAuth Server] OAuth error:', data.error, data.error_description);
			return json(
				{ error: data.error, message: data.error_description || data.error },
				{ status: 400 }
			);
		}

		console.log('🔐 [OAuth Server] Device flow initiated successfully');

		// Return sanitized response (without exposing client_id)
		return json({
			device_code: data.device_code,
			user_code: data.user_code,
			verification_uri: data.verification_uri,
			expires_in: data.expires_in,
			interval: data.interval
		});
	} catch (error) {
		console.error('🔐 [OAuth Server] Unexpected error:', error);
		return json(
			{ error: 'server_error', message: 'Unexpected error during device flow initiation' },
			{ status: 500 }
		);
	}
};
