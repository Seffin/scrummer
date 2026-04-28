/**
 * GitHub OAuth Client
 * Handles OAuth 2.0 Device Flow for browser-based authentication
 */

export interface OAuthConfig {
	clientId: string;
	scopes: string;
	authorizationUrl: string;
	tokenUrl: string;
}

export interface DeviceCodeResponse {
	device_code: string;
	user_code: string;
	verification_uri: string;
	expires_in: number;
	interval: number;
}

export interface TokenResponse {
	access_token: string;
	token_type: string;
	scope: string;
	expires_in?: number;
}

export interface OAuthError {
	error: string;
	error_description?: string;
}

export type PollStatus = 
	| 'pending' 
	| 'authorized' 
	| 'expired_token' 
	| 'slow_down' 
	| 'authorization_declined' 
	| 'error';

export interface PollResponse {
	status: PollStatus;
	token?: TokenResponse;
	error?: string;
}

export class GitHubOAuthClient {
	private config: OAuthConfig;
	private deviceCode: string | null = null;
	private expiresAt: number = 0;
	private pollInterval: number = 5;
	private isPolling: boolean = false;
	private pollTimer: ReturnType<typeof setTimeout> | null = null;
	private onStatusChange: ((status: PollStatus, data?: TokenResponse) => void) | null = null;

	constructor(config?: Partial<OAuthConfig>) {
		this.config = {
			clientId: config?.clientId || import.meta.env.VITE_GITHUB_DEVICE_CLIENT_ID || '',
			scopes: config?.scopes || import.meta.env.VITE_GITHUB_OAUTH_SCOPES || 'repo read:org',
			authorizationUrl: 'https://github.com/login/device/code',
			tokenUrl: 'https://github.com/login/oauth/access_token'
		};
	}

	/**
	 * Check if OAuth is properly configured
	 */
	isConfigured(): boolean {
		return !!this.config.clientId && this.config.clientId !== 'YOUR_CLIENT_ID';
	}

	/**
	 * Get current configuration
	 */
	getConfig(): OAuthConfig {
		return { ...this.config };
	}

	/**
	 * Initiate the device flow by requesting a device code from GitHub
	 */
	async initiateDeviceFlow(): Promise<DeviceCodeResponse> {
		if (!this.isConfigured()) {
			throw new Error(
				'OAuth is not configured. Set VITE_GITHUB_DEVICE_CLIENT_ID in your environment.'
			);
		}

		console.log('🔐 [OAuth] Initiating device flow...');

		const response = await fetch(this.config.authorizationUrl, {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				client_id: this.config.clientId,
				scope: this.config.scopes
			})
		});

		if (!response.ok) {
			const text = await response.text();
			console.error('🔐 [OAuth] Device code request failed:', response.status, text);
			throw new Error(`Failed to initiate OAuth device flow: ${response.statusText}`);
		}

		const data = await response.json() as DeviceCodeResponse | OAuthError;
		
		if ('error' in data) {
			console.error('🔐 [OAuth] OAuth error:', data.error, data.error_description);
			throw new Error(data.error_description || data.error);
		}

		this.deviceCode = data.device_code;
		this.expiresAt = Date.now() + (data.expires_in * 1000);
		this.pollInterval = data.interval;

		console.log('🔐 [OAuth] Device flow initiated:', {
			userCode: data.user_code,
			expiresIn: data.expires_in,
			interval: data.interval
		});

		return data;
	}

	/**
	 * Start polling for authorization status
	 */
	startPolling(onStatusChange: (status: PollStatus, data?: TokenResponse) => void): void {
		if (!this.deviceCode) {
			throw new Error('Device flow not initiated. Call initiateDeviceFlow() first.');
		}

		if (this.isPolling) {
			console.log('🔐 [OAuth] Already polling');
			return;
		}

		this.onStatusChange = onStatusChange;
		this.isPolling = true;
		console.log('🔐 [OAuth] Starting authorization polling...');

		this.poll();
	}

	/**
	 * Stop polling
	 */
	stopPolling(): void {
		this.isPolling = false;
		if (this.pollTimer) {
			clearTimeout(this.pollTimer);
			this.pollTimer = null;
		}
		console.log('🔐 [OAuth] Stopped polling');
	}

	/**
	 * Poll GitHub for authorization status
	 */
	private async poll(): Promise<void> {
		if (!this.isPolling || !this.deviceCode) {
			return;
		}

		// Check if device code has expired
		if (Date.now() > this.expiresAt) {
			console.log('🔐 [OAuth] Device code expired');
			this.stopPolling();
			this.onStatusChange?.('expired_token');
			return;
		}

		try {
			const response = await fetch(this.config.tokenUrl, {
				method: 'POST',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					client_id: this.config.clientId,
					device_code: this.deviceCode,
					grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
				})
			});

			const data = await response.json() as TokenResponse | OAuthError;

			if ('error' in data) {
				console.log('🔐 [OAuth] Poll response:', data.error);

				switch (data.error) {
					case 'authorization_pending':
						// User hasn't authorized yet, continue polling
						this.scheduleNextPoll();
						return;

					case 'slow_down':
						// GitHub asks us to slow down
						this.pollInterval = Math.min(this.pollInterval * 1.5, 60);
						this.scheduleNextPoll();
						return;

					case 'expired_token':
						this.stopPolling();
						this.onStatusChange?.('expired_token');
						return;

					case 'authorization_declined':
						this.stopPolling();
						this.onStatusChange?.('authorization_declined', undefined);
						return;

					default:
						this.stopPolling();
						this.onStatusChange?.('error', undefined);
						return;
				}
			}

			// Success! Token received
			console.log('🔐 [OAuth] Authorization successful!');
			this.stopPolling();
			this.onStatusChange?.('authorized', data as TokenResponse);

		} catch (error) {
			console.error('🔐 [OAuth] Poll error:', error);
			this.stopPolling();
			this.onStatusChange?.('error');
		}
	}

	/**
	 * Schedule the next poll
	 */
	private scheduleNextPoll(): void {
		this.pollTimer = setTimeout(() => {
			this.poll();
		}, this.pollInterval * 1000);
	}

	/**
	 * Get time remaining before device code expires
	 */
	getTimeRemaining(): number {
		return Math.max(0, this.expiresAt - Date.now());
	}

	/**
	 * Reset the client state
	 */
	reset(): void {
		this.stopPolling();
		this.deviceCode = null;
		this.expiresAt = 0;
		this.pollInterval = 5;
		this.onStatusChange = null;
	}
}

// Default export for convenience
export const githubOAuth = new GitHubOAuthClient();
