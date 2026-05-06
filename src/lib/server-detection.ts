/**
 * Server Detection and Routing
 * Detects local server availability and routes API calls appropriately
 */

export interface ServerInfo {
  isLocalAvailable: boolean;
  localUrl: string;
  remoteUrl: string;
  currentUrl: string;
  serverType: 'local' | 'remote';
}

export interface HealthResponse {
  status: string;
  server: string;
  timestamp: string;
}

class ServerDetection {
  private static instance: ServerDetection;
  private serverInfo: ServerInfo | null = null;
  private healthCheckPromise: Promise<boolean> | null = null;

  private constructor() {}

  static getInstance(): ServerDetection {
    if (!ServerDetection.instance) {
      ServerDetection.instance = new ServerDetection();
    }
    return ServerDetection.instance;
  }

  /**
   * Check if local server is available
   */
  async checkLocalServer(): Promise<boolean> {
    if (this.healthCheckPromise) {
      return this.healthCheckPromise;
    }

    this.healthCheckPromise = this.performHealthCheck();
    
    try {
      const isAvailable = await this.healthCheckPromise;
      return isAvailable;
    } finally {
      this.healthCheckPromise = null;
    }
  }

  private async performHealthCheck(): Promise<boolean> {
    try {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const response = await fetch(`http://${hostname}:3001/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });

      if (response.ok) {
        const data = await response.json() as HealthResponse;
        console.log('✅ Backend server detected:', data.server);
        return true;
      }
      return false;
    } catch (error) {
      console.log('❌ Backend server not available:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Get server information and determine routing
   */
  async getServerInfo(): Promise<ServerInfo> {
    if (this.serverInfo) {
      return this.serverInfo;
    }

    const isLocalAvailable = await this.checkLocalServer();
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const localUrl = `http://${hostname}:3001`;
    
    this.serverInfo = {
      isLocalAvailable,
      localUrl,
      remoteUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
      currentUrl: isLocalAvailable ? localUrl : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'),
      serverType: isLocalAvailable ? 'local' : 'remote'
    };

    console.log('🔗 Server routing determined:', {
      type: this.serverInfo.serverType,
      url: this.serverInfo.currentUrl
    });

    return this.serverInfo;
  }

  /**
   * Get the appropriate API base URL for GitHub operations
   */
  async getApiBaseUrl(): Promise<string> {
    const serverInfo = await this.getServerInfo();
    return serverInfo.currentUrl;
  }

  /**
   * Check if current session is using local server
   */
  async isUsingLocalServer(): Promise<boolean> {
    const serverInfo = await this.getServerInfo();
    return serverInfo.serverType === 'local';
  }

  /**
   * Force refresh server detection
   */
  async refreshDetection(): Promise<ServerInfo> {
    this.serverInfo = null;
    this.healthCheckPromise = null;
    return this.getServerInfo();
  }

  /**
   * Get server status for UI display
   */
  async getServerStatus(): Promise<{
    type: 'local' | 'remote';
    status: 'connected' | 'disconnected';
    url: string;
    message: string;
  }> {
    const serverInfo = await this.getServerInfo();
    
    if (serverInfo.serverType === 'local') {
      return {
        type: 'local',
        status: 'connected',
        url: serverInfo.localUrl,
        message: 'Using local GitHub CLI'
      };
    } else {
      return {
        type: 'remote',
        status: 'disconnected',
        url: serverInfo.remoteUrl,
        message: 'Using remote server (mobile mode)'
      };
    }
  }
}

export const serverDetection = ServerDetection.getInstance();
