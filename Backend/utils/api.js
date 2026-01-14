// ==================== API CLIENT FOR FRONTEND ====================
// This file contains all API calls to the backend server

class APIClient {
  constructor() {
    this.baseURL = 'http://localhost:3000/api';
    this.tokenKey = 'phishnet_token';
    this.userKey = 'phishnet_user';
  }

  // ======================== HELPER METHODS ========================

  // Get token from localStorage
  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  // Set token in localStorage
  setToken(token) {
    localStorage.setItem(this.tokenKey, token);
  }

  // Remove token from localStorage
  removeToken() {
    localStorage.removeItem(this.tokenKey);
  }

  // Get user from localStorage
  getUser() {
    const userData = localStorage.getItem(this.userKey);
    return userData ? JSON.parse(userData) : null;
  }

  // Set user in localStorage
  setUser(user) {
    // Compute single-letter initials so UI never shows 'undefined'
    const computeInitials = (email, firstName) => {
      if (firstName && firstName.length > 0) return firstName[0].toUpperCase();
      const local = (email || '').split('@')[0] || '';
      const char = local.replace(/[^A-Za-z0-9]/g, '').charAt(0);
      return (char || 'U').toUpperCase();
    };

    if (user) {
      user.initials = computeInitials(user.email, user.firstName);
    }
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  // Remove user from localStorage
  removeUser() {
    localStorage.removeItem(this.userKey);
  }

  // Generic fetch request method with auth
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add token to headers if available
    const token = this.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      console.log(`📡 API Request: ${options.method || 'GET'} ${url}`, { headers, body: options.body });
      
      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log(`📊 Response Status: ${response.status}`);

      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401) {
        this.removeToken();
        this.removeUser();
        // Redirect to login if on protected page
        if (window.location.pathname !== '/login.html' && window.location.pathname !== '/signup.html' && window.location.pathname !== '/') {
          window.location.href = '/login.html';
        }
      }

      const data = await response.json();
      console.log(`📦 Response Data:`, data);

      if (!response.ok) {
        const error = new Error(data.message || 'API request failed');
        error.status = response.status;
        error.data = data;
        console.error(`❌ API Error:`, error);
        throw error;
      }

      console.log(`✅ Success`);
      return data;
    } catch (error) {
      console.error('❌ API Error (caught):', error, error?.stack);
      throw error;
    }
  }

  // ======================== AUTH ENDPOINTS ========================

  // Register new user
  async register(firstName, lastName, email, password, confirmPassword) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        password,
        confirmPassword,
      }),
    });

    if (response.success) {
      this.setToken(response.data.token);
      this.setUser(response.data.user);
    }

    return response;
  }

  // Login user
  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success) {
      this.setToken(response.data.token);
      this.setUser(response.data.user);
    }

    return response;
  }

  // Logout user
  async logout() {
    const response = await this.request('/auth/logout', {
      method: 'POST',
    });

    if (response.success) {
      this.removeToken();
      this.removeUser();
    }

    return response;
  }

  // Verify token validity
  async verifyToken() {
    return await this.request('/auth/verify', {
      method: 'POST',
    });
  }

  // Refresh token
  async refreshToken() {
    const response = await this.request('/auth/refresh', {
      method: 'POST',
    });

    if (response.success) {
      this.setToken(response.data.token);
    }

    return response;
  }

  // ======================== SCAN ENDPOINTS ========================

  // Check URL safety
  async checkURL(url) {
    return await this.request('/scan/url', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  // Check email safety
  async checkEmail(senderEmail, emailContent, subject = '') {
    return await this.request('/scan/email', {
      method: 'POST',
      body: JSON.stringify({
        senderEmail,
        emailContent,
        subject,
      }),
    });
  }

  // Batch check URLs (requires authentication)
  async batchCheckURLs(urls) {
    return await this.request('/scan/batch', {
      method: 'POST',
      body: JSON.stringify({ urls }),
    });
  }

  // ======================== USER ENDPOINTS ========================

  // Get user profile
  async getProfile() {
    return await this.request('/users/profile', {
      method: 'GET',
    });
  }

  // Update user profile
  async updateProfile(firstName, lastName, email) {
    const response = await this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify({ firstName, lastName, email }),
    });

    if (response.success) {
      this.setUser(response.data.user);
    }

    return response;
  }

  // Update password
  async updatePassword(currentPassword, newPassword, confirmPassword) {
    return await this.request('/users/password', {
      method: 'PUT',
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    });
  }

  // Update preferences
  async updatePreferences(emailNotifications, weeklyReportEmail, twoFactorEnabled) {
    return await this.request('/users/preferences', {
      method: 'PUT',
      body: JSON.stringify({
        emailNotifications,
        weeklyReportEmail,
        twoFactorEnabled,
      }),
    });
  }

  // Get check history
  async getHistory(page = 1, limit = 20, threatType = null, isSafe = null) {
    let url = `/users/history?page=${page}&limit=${limit}`;
    if (threatType) url += `&threatType=${threatType}`;
    if (isSafe !== null) url += `&isSafe=${isSafe}`;

    return await this.request(url, { method: 'GET' });
  }

  // Get user statistics
  async getStats() {
    return await this.request('/users/stats', {
      method: 'GET',
    });
  }

  // Get recent activity
  async getActivity(days = 7) {
    return await this.request(`/users/activity?days=${days}`, {
      method: 'GET',
    });
  }

  // Delete account
  async deleteAccount(password) {
    const response = await this.request('/users/account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });

    if (response.success) {
      this.removeToken();
      this.removeUser();
    }

    return response;
  }

  // ======================== ANALYTICS ENDPOINTS ========================

  // Get dashboard data
  async getDashboard() {
    return await this.request('/analytics/dashboard', {
      method: 'GET',
    });
  }

  // Get trending data
  async getTrends(days = 30) {
    return await this.request(`/analytics/trends?days=${days}`, {
      method: 'GET',
    });
  }

  // Get platform summary
  async getSummary() {
    return await this.request('/analytics/summary', {
      method: 'GET',
    });
  }

  // Get top phishing domains
  async getTopDomains(limit = 10) {
    return await this.request(`/analytics/top-domains?limit=${limit}`, {
      method: 'GET',
    });
  }

  // Get dangerous URLs today
  async getDangerousToday() {
    return await this.request('/analytics/dangerous-today', {
      method: 'GET',
    });
  }

  // Get user rankings
  async getRankings(type = 'urls_checked', limit = 10) {
    return await this.request(`/analytics/rankings?type=${type}&limit=${limit}`, {
      method: 'GET',
    });
  }

  // Get threat distribution
  async getThreatDistribution() {
    return await this.request('/analytics/threat-distribution', {
      method: 'GET',
    });
  }

  // Get recent activity (platform)
  async getRecentActivity(limit = 20) {
    return await this.request(`/analytics/recent-activity?limit=${limit}`, {
      method: 'GET',
    });
  }

  // Get analytics overview
  async getOverview() {
    return await this.request('/analytics/overview', {
      method: 'GET',
    });
  }

  // ======================== HEALTH CHECK ========================

  // Check if API server is running
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      const data = await response.json();
      return data.status === 'Server is running';
    } catch {
      return false;
    }
  }
}

// Create global instance
const api = new APIClient();
window.api = api;
