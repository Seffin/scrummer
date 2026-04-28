/**
 * Dual API Layer
 * Routes GitHub API requests to local server or remote server based on availability
 */

import { serverDetection } from '$lib/server-detection';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  source: 'local' | 'remote';
  status: number;
}

class DualApiLayer {
  private static instance: DualApiLayer;

  private constructor() {}

  static getInstance(): DualApiLayer {
    if (!DualApiLayer.instance) {
      DualApiLayer.instance = new DualApiLayer();
    }
    return DualApiLayer.instance;
  }

  /**
   * Make API request to appropriate server
   */
  private async makeRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const baseUrl = await serverDetection.getApiBaseUrl();
    const isLocal = await serverDetection.isUsingLocalServer();
    
    const url = `${baseUrl}${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      console.log(`🔗 Making ${isLocal ? 'LOCAL' : 'REMOTE'} request to:`, endpoint);
      
      const response = await fetch(url, {
        ...options,
        headers: defaultHeaders,
        signal: AbortSignal.timeout(15000) // 15 second timeout
      });

      const data = response.ok ? await response.json() : null;
      
      return {
        data,
        error: response.ok ? undefined : data?.message || `HTTP ${response.status}`,
        source: isLocal ? 'local' : 'remote',
        status: response.status
      };
    } catch (error) {
      console.error(`❌ ${isLocal ? 'LOCAL' : 'REMOTE'} request failed:`, error);
      
      // If local server fails, try remote fallback
      if (isLocal) {
        console.log('🔄 Local server failed, attempting remote fallback...');
        return this.makeRemoteFallback<T>(endpoint, options);
      }
      
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        source: isLocal ? 'local' : 'remote',
        status: 0
      };
    }
  }

  /**
   * Remote fallback when local server fails
   */
  private async makeRemoteFallback<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const remoteUrl = window.location.origin;
    const url = `${remoteUrl}${endpoint}`;
    
    try {
      console.log('🔄 Trying remote fallback:', endpoint);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        signal: AbortSignal.timeout(10000)
      });

      const data = response.ok ? await response.json() : null;
      
      return {
        data,
        error: response.ok ? undefined : data?.message || `HTTP ${response.status}`,
        source: 'remote',
        status: response.status
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Remote fallback failed',
        source: 'remote',
        status: 0
      };
    }
  }

  // GitHub CLI Check
  async checkGitHubCli(): Promise<ApiResponse<{ available: boolean; version?: string }>> {
    return this.makeRequest('/api/github/gh-cli/check', {
      method: 'POST'
    });
  }

  // Get GitHub Token
  async getGitHubToken(): Promise<ApiResponse<{ token: string }>> {
    return this.makeRequest('/api/github/gh-cli/token', {
      method: 'POST'
    });
  }

  // Get GitHub User
  async getGitHubUser(): Promise<ApiResponse<{ user: any }>> {
    const isLocal = await serverDetection.isUsingLocalServer();
    if (isLocal) {
      return this.makeRequest('/api/github/cli/user', { method: 'POST' });
    }

    const response = await this.makeRemoteFallback<{ owners: string[] }>('/api/github/options/owners');
    if (response.error) {
      return {
        data: undefined,
        error: response.error,
        source: 'remote',
        status: response.status
      };
    }

    const firstOwner = response.data?.owners?.[0] ?? null;
    return {
      data: { user: firstOwner ? { login: firstOwner } : null } as any,
      source: 'remote',
      status: response.status
    };
  }

  // Get Organizations
  async getOrganizations(): Promise<ApiResponse<{ orgs: any[] }>> {
    const isLocal = await serverDetection.isUsingLocalServer();
    if (isLocal) {
      return this.makeRequest('/api/github/cli/orgs', { method: 'POST' });
    }

    const response = await this.makeRemoteFallback<{ owners: string[] }>('/api/github/options/owners');
    return {
      data: response.data ? { orgs: response.data.owners.map((login) => ({ login })) } : undefined,
      error: response.error,
      source: 'remote',
      status: response.status
    };
  }

  // Get Repositories
  async getRepositories(): Promise<ApiResponse<{ repos: any[] }>> {
    const isLocal = await serverDetection.isUsingLocalServer();
    if (isLocal) {
      return this.makeRequest('/api/github/cli/repos', { method: 'POST' });
    }

    const ownersResponse = await this.makeRemoteFallback<{ owners: string[] }>('/api/github/options/owners');
    const owner = ownersResponse.data?.owners?.[0];
    if (!owner) {
      return {
        data: { repos: [] },
        error: ownersResponse.error,
        source: 'remote',
        status: ownersResponse.status
      };
    }

    const reposResponse = await this.makeRemoteFallback<{ repos: any[] }>(
      `/api/github/options/repos?owner=${encodeURIComponent(owner)}`
    );
    return {
      data: reposResponse.data ? { repos: reposResponse.data.repos } : undefined,
      error: reposResponse.error,
      source: 'remote',
      status: reposResponse.status
    };
  }

  // Get Issues
  async getIssues(owner: string, repo: string): Promise<ApiResponse<{ issues: any[] }>> {
    const isLocal = await serverDetection.isUsingLocalServer();
    if (isLocal) {
      return this.makeRequest(`/api/github/cli/issues/${owner}/${repo}`, {
        method: 'POST'
      });
    }

    return this.makeRemoteFallback<{ issues: any[] }>(
      `/api/github/issues?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`
    );
  }

  // Create Issue (remote only)
  async createIssue(owner: string, repo: string, issueData: any): Promise<ApiResponse> {
    // Issue creation is only available on remote server
    const remoteUrl = window.location.origin;
    const endpoint = `/api/github/issues/create`;
    
    try {
      const response = await fetch(`${remoteUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ owner, repo, ...issueData }),
        signal: AbortSignal.timeout(15000)
      });

      const data = response.ok ? await response.json() : null;
      
      return {
        data,
        error: response.ok ? undefined : data?.message || `HTTP ${response.status}`,
        source: 'remote',
        status: response.status
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to create issue',
        source: 'remote',
        status: 0
      };
    }
  }

  // Get server status
  async getServerStatus() {
    return serverDetection.getServerStatus();
  }
}

export const dualApi = DualApiLayer.getInstance();
