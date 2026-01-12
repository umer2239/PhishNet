// PhishNet API Service
// Handles all backend API communication with JWT authentication

class APIService {
  constructor() {
    this.baseURL = 'https://backend-phishnet.onrender.com/api/v1';
    this.tokenKey = 'phishnet_token';
  }

  // Get auth token from localStorage
  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  // Set auth token in localStorage
  setToken(token) {
    localStorage.setItem(this.tokenKey, token);
  }

  // Remove auth token
  removeToken() {
    localStorage.removeItem(this.tokenKey);
  }

  // Make authenticated API request
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      }
    };

    // Add auth token if available
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // ==================== AUTH ENDPOINTS ====================
  
  async register(userData) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    
    if (response.success && response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async login(credentials) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    
    if (response.success && response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async logout() {
    try {
      await this.request('/auth/logout', {
        method: 'POST'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.removeToken();
    }
  }

  async getProfile() {
    return await this.request('/auth/me', {
      method: 'GET'
    });
  }

  async updateProfile(profileData) {
    return await this.request('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  async changePassword(passwordData) {
    return await this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(passwordData)
    });
  }

  async deleteAccount() {
    const response = await this.request('/auth/me', {
      method: 'DELETE'
    });
    this.removeToken();
    return response;
  }

  // ==================== SCAN ENDPOINTS ====================
  
  async createScan(scanData) {
    return await this.request('/scans', {
      method: 'POST',
      body: JSON.stringify(scanData)
    });
  }

  async getScans(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/scans?${queryString}` : '/scans';
    return await this.request(endpoint, {
      method: 'GET'
    });
  }

  async getScanById(scanId) {
    return await this.request(`/scans/${scanId}`, {
      method: 'GET'
    });
  }

  async getScanStats() {
    return await this.request('/scans/stats', {
      method: 'GET'
    });
  }

  async getRecentScans(limit = 10) {
    return await this.request(`/scans/recent?limit=${limit}`, {
      method: 'GET'
    });
  }

  // ==================== SETTINGS ENDPOINTS ====================
  
  async getSettings() {
    return await this.request('/settings', {
      method: 'GET'
    });
  }

  async updateSettings(settingsData) {
    return await this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsData)
    });
  }

  // ==================== HELPER METHODS ====================
  
  isAuthenticated() {
    return !!this.getToken();
  }

  async verifyAuth() {
    if (!this.isAuthenticated()) {
      return false;
    }

    try {
      await this.getProfile();
      return true;
    } catch (error) {
      this.removeToken();
      return false;
    }
  }
}

// Create and export singleton instance
const apiService = new APIService();

// Make it globally available for app.js
window.apiService = apiService;
