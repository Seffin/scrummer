/**
 * GitHub Device Flow Authentication Service
 * Implements GitHub's Device Flow for token-based authentication
 */

const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const CLIENT_ID = import.meta.env.VITE_GITHUB_DEVICE_CLIENT_ID || 'YOUR_CLIENT_ID';

// Check if CLIENT_ID is properly configured
const isDeviceFlowConfigured = CLIENT_ID !== 'YOUR_CLIENT_ID';

export interface DeviceCodeResponse {
	device_code: string;
	user_code: string;
	verification_uri: string;
	expires_in: number;
	interval: number;
}

export interface DeviceTokenResponse {
	access_token: string;
	token_type: string;
	scope: string;
}

export interface DeviceFlowState {
	deviceCode: string;
	userCode: string;
	verificationUrl: string;
	expiresAt: number;
	interval: number;
	isPolling: boolean;
	status: 'pending' | 'authorized' | 'expired' | 'error';
	error?: string;
}

export class DeviceFlowService {
	private pollTimer: ReturnType<typeof setTimeout> | null = null;
	private state: DeviceFlowState | null = null;
	private onStateChange: ((state: DeviceFlowState) => void) | null = null;

	/**
	 * Initialize the device flow by requesting a device code from GitHub
	 */
	async initiateDeviceFlow(): Promise<DeviceFlowState> {
		console.log('🔐 Initiating GitHub Device Flow...');
		
		// Check if device flow is properly configured
		if (!isDeviceFlowConfigured) {
			console.error('🔐 Device Flow not configured - CLIENT_ID not set');
			throw new Error('Device Flow authentication is not configured. Set VITE_GITHUB_DEVICE_CLIENT_ID in your environment, then restart the app.');
		}
		
		try {
			// Request device code from GitHub
			const response = await fetch(GITHUB_DEVICE_CODE_URL, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					client_id: CLIENT_ID,
					scope: 'repo read:org'
				})
			});

			if (!response.ok) {
				throw new Error(`Failed to initiate device flow: ${response.statusText}`);
			}

			const data: DeviceCodeResponse = await response.json();
			const expiresAt = Date.now() + (data.expires_in * 1000);

			this.state = {
				deviceCode: data.device_code,
				userCode: data.user_code,
				verificationUrl: data.verification_uri,
				expiresAt,
				interval: data.interval,
				isPolling: false,
				status: 'pending'
			};

			console.log('🔐 Device flow initiated:', {
				userCode: this.state.userCode,
				verificationUrl: this.state.verificationUrl,
				expiresAt: new Date(this.state.expiresAt).toISOString()
			});

			this.notifyStateChange();
			return this.state;
		} catch (error) {
			console.error('🔐 Device flow initiation failed:', error);
			throw error;
		}
	}

	/**
	 * Start polling GitHub for authorization status
	 */
	startPolling(): void {
		if (!this.state || this.state.isPolling) {
			return;
		}

		console.log('🔐 Starting authorization polling...');
		this.state.isPolling = true;
		this.state.status = 'pending';
		this.notifyStateChange();

		this.pollForAuthorization();
	}

	/**
	 * Stop polling for authorization
	 */
	stopPolling(): void {
		if (this.pollTimer) {
			clearTimeout(this.pollTimer);
			this.pollTimer = null;
		}

		if (this.state) {
			this.state.isPolling = false;
			this.notifyStateChange();
		}

		console.log('🔐 Stopped authorization polling');
	}

	/**
	 * Poll GitHub for authorization status
	 */
	private async pollForAuthorization(): Promise<void> {
		if (!this.state || !this.state.isPolling) {
			return;
		}

		// Check if device code has expired
		if (Date.now() > this.state.expiresAt) {
			console.log('🔐 Device code expired');
			this.state.status = 'expired';
			this.state.isPolling = false;
			this.notifyStateChange();
			return;
		}

		try {
			console.log('🔐 Polling for authorization status...');
			
			const response = await fetch(GITHUB_TOKEN_URL, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					client_id: CLIENT_ID,
					device_code: this.state.deviceCode,
					grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				
				if (errorData.error === 'authorization_pending') {
					// User hasn't authorized yet, continue polling
					console.log('🔐 Authorization pending, continuing poll...');
					this.scheduleNextPoll();
					return;
				} else if (errorData.error === 'slow_down') {
					// GitHub is asking us to slow down
					console.log('🔐 Slow down requested, increasing interval...');
					this.state.interval *= 1.5;
					this.scheduleNextPoll();
					return;
				} else if (errorData.error === 'expired_token') {
					console.log('🔐 Device code expired during polling');
					this.state.status = 'expired';
					this.state.isPolling = false;
					this.notifyStateChange();
					return;
				} else {
					throw new Error(`Polling error: ${errorData.error_description || errorData.error}`);
				}
			}

			// Authorization successful!
			const tokenData: DeviceTokenResponse = await response.json();
			console.log('🔐 Authorization successful!');

			if (this.state) {
				this.state.status = 'authorized';
				this.state.isPolling = false;
			}

			this.notifyStateChange();
			
			// Store the token using existing auth system
			const { authenticateWithToken } = await import('./auth');
			authenticateWithToken(tokenData.access_token);

		} catch (error) {
			console.error('🔐 Polling error:', error);
			if (this.state) {
				this.state.status = 'error';
				this.state.error = error instanceof Error ? error.message : 'Unknown polling error';
				this.state.isPolling = false;
			}
			this.notifyStateChange();
		}
	}

	/**
	 * Schedule the next poll based on the interval
	 */
	private scheduleNextPoll(): void {
		if (!this.state || !this.state.isPolling) {
			return;
		}

		this.pollTimer = setTimeout(() => {
			this.pollForAuthorization();
		}, this.state.interval * 1000);
	}

	/**
	 * Subscribe to state changes
	 */
	onStateChangeSubscribe(callback: (state: DeviceFlowState) => void): void {
		this.onStateChange = callback;
	}

	/**
	 * Notify subscribers of state changes
	 */
	private notifyStateChange(): void {
		if (this.onStateChange && this.state) {
			this.onStateChange(this.state);
		}
	}

	/**
	 * Get current device flow state
	 */
	getState(): DeviceFlowState | null {
		return this.state;
	}

	/**
	 * Reset the device flow state
	 */
	reset(): void {
		this.stopPolling();
		this.state = null;
		this.notifyStateChange();
	}

	/**
	 * Cleanup resources
	 */
	cleanup(): void {
		this.stopPolling();
		this.onStateChange = null;
		this.state = null;
	}
}

export const deviceFlowService = new DeviceFlowService();
