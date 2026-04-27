const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

let isOnlineMode = localStorage.getItem('bac_sport_online_mode') === 'true';

export const setOnlineMode = (online: boolean) => {
  isOnlineMode = online;
  localStorage.setItem('bac_sport_online_mode', online.toString());
};

export const getOnlineMode = (): boolean => isOnlineMode;

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  timestamp: number;
}

class ApiService {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.loadTokens();
  }

  private loadTokens(): void {
    this.accessToken = localStorage.getItem('bac_sport_access_token');
    this.refreshToken = localStorage.getItem('bac_sport_refresh_token');
  }

  private saveTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('bac_sport_access_token', accessToken);
    localStorage.setItem('bac_sport_refresh_token', refreshToken);
  }

  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('bac_sport_access_token');
    localStorage.removeItem('bac_sport_refresh_token');
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 && data.code === 'TOKEN_EXPIRED' && this.refreshToken) {
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            return this.request(endpoint, options);
          }
        }
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error - server may be offline');
      }
      throw error;
    }
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        this.saveTokens(data.data.accessToken, data.data.refreshToken);
        return true;
      }

      this.clearTokens();
      return false;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async login(username: string, password: string): Promise<{ user: unknown; accessToken: string; refreshToken: string }> {
    const response = await this.post<{ user: unknown; accessToken: string; refreshToken: string }>('/auth/login', {
      username,
      password,
    });

    if (response.success && response.data) {
      this.saveTokens(response.data.accessToken, response.data.refreshToken);
      return response.data;
    }

    throw new Error(response.error || 'Login failed');
  }

  async setup(username: string, password: string, recoveryQuestion?: string, recoveryAnswer?: string): Promise<{ user: unknown; accessToken: string; refreshToken: string }> {
    const response = await this.post<{ user: unknown; accessToken: string; refreshToken: string }>('/auth/setup', {
      username,
      password,
      recoveryQuestion,
      recoveryAnswer,
    });

    if (response.success && response.data) {
      this.saveTokens(response.data.accessToken, response.data.refreshToken);
      return response.data;
    }

    throw new Error(response.error || 'Setup failed');
  }

  async logout(): Promise<void> {
    try {
      await this.post('/auth/logout');
    } catch {
      // Ignore errors on logout
    }
    this.clearTokens();
  }

  async checkStatus(): Promise<boolean> {
    try {
      const response = await this.get<{ configured: boolean }>('/auth/status');
      return response.success && !!response.data?.configured;
    } catch {
      return false;
    }
  }
}

export const api = new ApiService();
export default api;