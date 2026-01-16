// ==================== TOAST NOTIFICATION SYSTEM ====================
let toastElement = null;
let toastTimeout = null;

function showToast(message, type = 'info', duration = 3000) {
  // Create toast element if it doesn't exist
  if (!toastElement) {
    toastElement = document.createElement('div');
    toastElement.className = 'toast-notification';
    document.body.appendChild(toastElement);
  }

  // Clear any existing timeout
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  // Remove all type classes
  toastElement.classList.remove('success', 'error', 'warning', 'info', 'show');
  
  // Icon symbols for each notification type
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  
  // Set message with icon and type
  const icon = icons[type] || '•';
  toastElement.innerHTML = `<span class="toast-icon" data-type="${type}">${icon}</span><span class="toast-message">${message}</span>`;
  toastElement.classList.add(type);
  
  // Trigger reflow to restart animation
  void toastElement.offsetWidth;
  
  // Show toast
  setTimeout(() => {
    toastElement.classList.add('show');
  }, 10);

  // Hide after duration
  toastTimeout = setTimeout(() => {
    toastElement.classList.remove('show');
  }, duration);
}

// ==================== SIMPLE DEMO AUTH MANAGER ====================
class AuthManager {
  constructor() {
    this.storageKey = 'phishnet_user';
    this.scanCountKey = 'phishnet_scan_count';
  }

  isLoggedIn() {
    return localStorage.getItem(this.storageKey) !== null;
  }

  login(email, password) {
    // Call backend API to login user
    return fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(error => {
          throw new Error(error.message || 'Login failed');
        });
      }
      return response.json();
    })
    .then(data => {
      if (data.success && data.data.token) {
        // Store token and user info
        localStorage.setItem('token', data.data.token);
        const user = {
          email: data.data.user.email,
          firstName: data.data.user.firstName,
          lastName: data.data.user.lastName,
          avatar: data.data.user.avatar || null,
          avatarFit: data.data.user.avatarFit || 'cover',
          initials: this.getInitials(data.data.user.email, data.data.user.firstName, data.data.user.lastName),
          loginTime: new Date().toISOString()
        };
        localStorage.setItem(this.storageKey, JSON.stringify(user));
        localStorage.setItem('pishnet_user', JSON.stringify(user));
        // Store avatar ONLY in window object for real-time access, NOT in localStorage
        // This prevents stale avatar issues and storage quota problems
        if (user.avatar) {
          window.currentUserAvatar = user.avatar;
          localStorage.setItem('avatarFitMode', user.avatarFit || 'cover');
        } else {
          window.currentUserAvatar = null;
          localStorage.removeItem('avatarFitMode');
        }
        return user;
      } else {
        throw new Error(data.message || 'Login failed');
      }
    });
  }

  logout() {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem('pishnet_user');
    localStorage.removeItem('phishnet_currentUser');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userAvatar');
    localStorage.removeItem('avatarFitMode');
    window.currentUserAvatar = null;
    window.location.href = 'index.html';
  }

  getUser() {
    const userData = localStorage.getItem(this.storageKey);
    return userData ? JSON.parse(userData) : null;
  }

  getInitials(email, firstName, lastName) {
    if (firstName && lastName) {
      return (firstName[0] + lastName[0]).toUpperCase();
    }
    if (firstName) {
      return firstName.substring(0, 2).toUpperCase();
    }
    const name = (email || '').split('@')[0];
    const parts = name.split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name.substring(0, 2) || '').toUpperCase();
  }

  setProfile(profile) {
    const user = Object.assign({}, this.getUser() || {}, profile);
    if (profile.firstName || profile.lastName) {
      user.initials = this.getInitials(profile.email || user.email, profile.firstName, profile.lastName);
    }
    if (profile.avatarFit !== undefined) {
      user.avatarFit = profile.avatarFit || 'cover';
      localStorage.setItem('avatarFitMode', user.avatarFit);
    }
    // Don't store large avatar data in localStorage - fetch from server instead
    localStorage.setItem(this.storageKey, JSON.stringify(user));
    localStorage.setItem('pishnet_user', JSON.stringify(user));
  }

  getScanCount() {
    return parseInt(localStorage.getItem(this.scanCountKey) || '0');
  }

  incrementScanCount() {
    const count = this.getScanCount() + 1;
    localStorage.setItem(this.scanCountKey, count.toString());
    return count;
  }

  canScanAsGuest() {
    return this.getScanCount() === 0;
  }

  register(userData) {
    // Call backend API to register user
    return fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        confirmPassword: userData.confirmPassword
      })
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(error => {
          throw new Error(error.message || 'Registration failed');
        });
      }
      return response.json();
    })
    .then(data => {
      if (data.success && data.data.token) {
        // Store token and user info
        localStorage.setItem('token', data.data.token);
        const user = {
          email: data.data.user.email,
          firstName: data.data.user.firstName,
          lastName: data.data.user.lastName,
          avatar: data.data.user.avatar || null,
          avatarFit: data.data.user.avatarFit || 'cover',
          initials: this.getInitials(data.data.user.email, data.data.user.firstName, data.data.user.lastName),
          loginTime: new Date().toISOString()
        };
        localStorage.setItem(this.storageKey, JSON.stringify(user));
        localStorage.setItem('pishnet_user', JSON.stringify(user));
        // Store avatar ONLY in window object for real-time access, NOT in localStorage
        // This prevents stale avatar issues and storage quota problems
        if (user.avatar) {
          window.currentUserAvatar = user.avatar;
          localStorage.setItem('avatarFitMode', user.avatarFit || 'cover');
        } else {
          window.currentUserAvatar = null;
          localStorage.removeItem('avatarFitMode');
        }
        return user;
      } else {
        throw new Error(data.message || 'Registration failed');
      }
    });
  }

  async refreshProfile() {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const response = await fetch('/api/users/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data.success && data.data && data.data.user) {
        const user = data.data.user;
        this.setProfile({
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarFit: user.avatarFit || 'cover',
        });

        // Store avatar in window object (not localStorage) to avoid storage quota issues
        // ALWAYS fetch fresh from server to get latest avatar
        if (user.avatar) {
          window.currentUserAvatar = user.avatar;
          localStorage.setItem('avatarFitMode', user.avatarFit || 'cover');
          // Remove stale localStorage avatar to force fresh fetches
          localStorage.removeItem('userAvatar');
        } else {
          window.currentUserAvatar = null;
          localStorage.removeItem('avatarFitMode');
          localStorage.removeItem('userAvatar');
        }
        
        // Apply avatar styling to all avatar elements
        this.applyAvatarStyling(user);
        
        return user;
      }
    } catch (err) {
      // Silent fail; user may not be logged in
    }
    return null;
  }

  // Apply avatar fit mode to all avatar elements on the page
  applyAvatarStyling(user) {
    if (!user || !user.avatar) return;
    
    const fitMode = user.avatarFit || 'cover';
    const avatarUrl = window.currentUserAvatar;
    
    // Add cache-busting timestamp to prevent showing stale cached images
    const cacheId = new Date().getTime();
    const urlWithCache = avatarUrl && !avatarUrl.startsWith('data:') 
      ? (avatarUrl.includes('?') ? `${avatarUrl}&t=${cacheId}` : `${avatarUrl}?t=${cacheId}`)
      : avatarUrl;
    
    // Update header avatar (.user-avatar)
    const headerAvatar = document.querySelector('.user-avatar');
    if (headerAvatar) {
      headerAvatar.style.backgroundImage = '';
      headerAvatar.style.backgroundImage = `url(${urlWithCache})`;
      headerAvatar.style.setProperty('background-size', fitMode, 'important');
      headerAvatar.style.backgroundPosition = 'center';
      headerAvatar.style.backgroundRepeat = 'no-repeat';
      headerAvatar.textContent = '';
    }
    
    // Update profile menu avatar (.profile-menu-avatar) if it exists
    const profileMenuAvatar = document.querySelector('.profile-menu-avatar');
    if (profileMenuAvatar) {
      profileMenuAvatar.style.backgroundImage = '';
      profileMenuAvatar.style.backgroundImage = `url(${urlWithCache})`;
      profileMenuAvatar.style.setProperty('background-size', fitMode, 'important');
      profileMenuAvatar.style.backgroundPosition = 'center';
      profileMenuAvatar.style.backgroundRepeat = 'no-repeat';
      profileMenuAvatar.textContent = '';
    }
    
    // Update settings avatar preview (.avatar-preview) if it exists
    const settingsAvatar = document.getElementById('settingsAvatarPreview');
    if (settingsAvatar) {
      settingsAvatar.style.backgroundImage = '';
      settingsAvatar.style.backgroundImage = `url(${urlWithCache})`;
      settingsAvatar.style.setProperty('background-size', fitMode, 'important');
      settingsAvatar.style.backgroundPosition = 'center';
      settingsAvatar.style.backgroundRepeat = 'no-repeat';
      settingsAvatar.textContent = '';
    }
  }
}

// Initialize AuthManager immediately
window.auth = new AuthManager();

// ==================== NAVIGATION MANAGEMENT ====================
class NavigationManager {
  constructor() {
    this.init();
  }

  init() {
    this.updateNavigation();
    this.setupEventListeners();
    this.setupDropdowns();
    this.refreshProfileAndUpdate();
  }

  async refreshProfileAndUpdate() {
    if (window.auth.isLoggedIn()) {
      const user = await window.auth.refreshProfile();
      // Ensure window.currentUserAvatar is set from fetched data
      if (user && user.avatar) {
        window.currentUserAvatar = user.avatar;
        console.log('Avatar refreshed from server:', user.avatar.substring(0, 50));
      } else {
        window.currentUserAvatar = null;
      }
      this.updateNavigation();
    }
  }

  updateNavigation() {
    const isLoggedIn = window.auth.isLoggedIn();

    // Update navigation links
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
      if (isLoggedIn) {
        this.showLoggedInNav();
      } else {
        this.showGuestNav();
      }
    }

    // Update auth buttons and user avatar
    const authButtons = document.querySelector('.auth-buttons');
    const userAvatar = document.querySelector('.user-avatar');
    const dashboardButton = document.querySelector('.btn-dashboard');

    if (authButtons && userAvatar) {
      if (isLoggedIn) {
        authButtons.style.display = 'none';
        userAvatar.style.display = 'flex';

        const user = window.auth.getUser();
        
        // Use window.currentUserAvatar (kept in memory) instead of localStorage
        const savedAvatar = window.currentUserAvatar;
        const savedFitMode = (user && user.avatarFit) || localStorage.getItem('avatarFitMode') || 'cover';
        
        if (savedAvatar) {
          // Add cache-busting timestamp to prevent showing stale cached images
          const cacheId = new Date().getTime();
          const urlWithCache = !savedAvatar.startsWith('data:')
            ? (savedAvatar.includes('?') ? `${savedAvatar}&t=${cacheId}` : `${savedAvatar}?t=${cacheId}`)
            : savedAvatar;
          userAvatar.style.backgroundImage = '';
          userAvatar.style.backgroundImage = `url(${urlWithCache})`;
          userAvatar.style.setProperty('background-size', savedFitMode, 'important');
          userAvatar.style.backgroundPosition = 'center';
          userAvatar.style.backgroundRepeat = 'no-repeat';
          userAvatar.textContent = '';
        } else {
          userAvatar.style.backgroundImage = '';
          userAvatar.textContent = user ? user.initials : '';
        }

        // Hide extra dashboard button
        if (dashboardButton) dashboardButton.style.display = 'none';
      } else {
        authButtons.style.display = 'flex';
        userAvatar.style.display = 'none';

        // Show dashboard button for guests
        if (dashboardButton) dashboardButton.style.display = 'inline-flex';
      }
    }

    // Apply logged-in class for global styling
    document.body.classList.toggle('logged-in', isLoggedIn);

    // Hide guest-only quick scan helper text when logged in
    const quickScanGuestText = document.getElementById('quick-scan-guest-text');
    if (quickScanGuestText) {
      quickScanGuestText.style.display = isLoggedIn ? 'none' : 'block';
    }

    // Safety check for landing page
    if (isLoggedIn && window.location.pathname.includes('index.html')) {
      setTimeout(() => {
        const landingDashboardBtn = document.querySelector('.btn-dashboard');
        if (landingDashboardBtn) landingDashboardBtn.style.display = 'none';
      }, 100);
    }
  }


  showLoggedInNav() {
    const navLinks = document.querySelector('.nav-links');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    navLinks.innerHTML = `
      <li><a href="dashboard.html" ${currentPage === 'dashboard.html' ? 'class="active"' : ''}>Dashboard</a></li>
      <li><a href="reports.html" ${currentPage === 'reports.html' ? 'class="active"' : ''}>Reports</a></li>
      <li><a href="blog.html" ${currentPage === 'blog.html' ? 'class="active"' : ''}>Blog</a></li>
      <li><a href="demo.html" ${currentPage === 'demo.html' ? 'class="active"' : ''}>Demo</a></li>
      <li><a href="pricing.html" ${currentPage === 'pricing.html' ? 'class="active"' : ''}>Pricing</a></li>
      <li class="dropdown">
        <a href="#" class="dropdown-toggle ${currentPage === 'about.html' || currentPage === 'faq.html' || currentPage === 'terms.html' || currentPage === 'privacy.html' ? 'active' : ''}">
          About
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: 0.25rem;">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </a>
        <ul class="dropdown-menu">
          <li><a href="about.html">About Us</a></li>
          <li><a href="faq.html">FAQs</a></li>
          <li><a href="terms.html">Terms of Use</a></li>
          <li><a href="privacy.html">Privacy Policy</a></li>
        </ul>
      </li>
    `;
  }

  showGuestNav() {
    const navLinks = document.querySelector('.nav-links');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    if (navLinks) {
      navLinks.innerHTML = `
       <li><a href="pricing.html" ${currentPage === 'pricing.html' ? 'class="active"' : ''}>Pricing</a></li>
       <li><a href="demo.html" ${currentPage === 'demo.html' ? 'class="active"' : ''}>Demo</a></li>
        <li><a href="blog.html" ${currentPage === 'blog.html' ? 'class="active"' : ''}>Blog</a></li>
        <li class="dropdown">
          <a href="#" class="dropdown-toggle ${currentPage === 'about.html' || currentPage === 'faq.html' || currentPage === 'terms.html' || currentPage === 'privacy.html' ? 'active' : ''}">
            About
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: 0.25rem;">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </a>
          <ul class="dropdown-menu">
            <li><a href="about.html">About Us</a></li>
            <li><a href="faq.html">FAQs</a></li>
            <li><a href="terms.html">Terms of Use</a></li>
            <li><a href="privacy.html">Privacy Policy</a></li>
          </ul>
        </li>
      `;
    }
  }

  setupEventListeners() {
    // Dashboard button click handler - redirect to login if not logged in
    const dashboardButtons = document.querySelectorAll('.btn-dashboard, [href="dashboard.html"]');
    dashboardButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (!window.auth.isLoggedIn()) {
          e.preventDefault();
          window.location.href = 'login.html';
        }
      });
    });

    // User avatar click handler
    const userAvatar = document.querySelector('.user-avatar');
    if (userAvatar) {
      userAvatar.addEventListener('click', () => {
        // Reverted: toggle profile menu on avatar click
        this.toggleProfileMenu();
      });
    }
  }

  setupDropdowns() {
    document.addEventListener('click', (e) => {
      const dropdownToggle = e.target.closest('.dropdown-toggle');
      if (dropdownToggle) {
        e.preventDefault();
        const dropdown = dropdownToggle.closest('.dropdown');
        dropdown.classList.toggle('active');
      } else {
        document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active'));
      }
    });
  }

  toggleProfileMenu() {
    const existingMenu = document.querySelector('.profile-menu');
    if (existingMenu) {
      existingMenu.remove();
      return;
    }

    const user = window.auth.getUser();
    const menu = document.createElement('div');
    menu.className = 'profile-menu';
    menu.innerHTML = `
      <div class="profile-menu-header">
        <div class="profile-menu-avatar"></div>
        <div class="profile-menu-info">
          <div class="profile-menu-email">${user ? user.email : ''}</div>
        </div>
      </div>
      <div class="profile-menu-divider"></div>
      <a href="settings.html" class="profile-menu-item">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v6m0 6v6m6-12v6m-6 0v6m-6-6v6"/>
        </svg>
        Settings
      </a>
      <button class="profile-menu-item" id="logout-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Logout
      </button>
    `;

    const avatarEl = menu.querySelector('.profile-menu-avatar');
    if (window.currentUserAvatar) {
      // Add cache-busting timestamp to prevent showing stale cached images
      const cacheId = new Date().getTime();
      const urlWithCache = !window.currentUserAvatar.startsWith('data:')
        ? (window.currentUserAvatar.includes('?') ? `${window.currentUserAvatar}&t=${cacheId}` : `${window.currentUserAvatar}?t=${cacheId}`)
        : window.currentUserAvatar;
      avatarEl.style.backgroundImage = '';
      avatarEl.style.backgroundImage = `url(${urlWithCache})`;
      avatarEl.style.setProperty('background-size', user?.avatarFit || 'cover', 'important');
      avatarEl.style.backgroundPosition = 'center';
      avatarEl.style.backgroundRepeat = 'no-repeat';
    } else if (user && user.initials) {
      avatarEl.textContent = user.initials;
    }

    const userAvatar = document.querySelector('.user-avatar');
    userAvatar.appendChild(menu);

    // Add event listener for logout button
    const logoutBtn = menu.querySelector('#logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => window.auth.logout());
    }

    setTimeout(() => {
      document.addEventListener('click', function closeMenu(e) {
        if (!e.target.closest('.user-avatar')) {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 10);
  }
}

// ==================== SCAN FUNCTIONALITY ====================
class ScanManager {
  constructor() {
    this.setupScanForms();
  }

  setupScanForms() {
    // URL scan forms
    document.querySelectorAll('form').forEach(form => {
      const urlInput = form.querySelector('#url-input, input[type="url"]');
      const emailInput = form.querySelector('#email-input, textarea');

      if (urlInput || emailInput) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleScan(urlInput || emailInput, urlInput ? 'url' : 'email');
        });
      }
    });
  }

  handleScan(input, type) {
    const value = input.value.trim();

    if (!value) {
      this.showNotification('Please enter a ' + type + ' to scan', 'error');
      return;
    }

    // Check if guest can scan
    if (!auth.isLoggedIn() && !auth.canScanAsGuest()) {
      this.showNotification('Login to continue scanning', 'warning');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
      return;
    }

    // Show scanning notification
    this.showNotification('Scanning ' + type + '...', 'info');

    // Simulate scan
    setTimeout(() => {
      const result = this.simulateScan(value, type);
      auth.incrementScanCount();
      this.showScanResult(result);
    }, 1000);
  }

  simulateScan(value, type) {
    // Simple demo scan with random results
    const threats = ['safe', 'suspicious', 'malicious'];
    const threat = threats[Math.floor(Math.random() * threats.length)];
    const confidence = threat === 'safe' ? 70 + Math.random() * 30 : 60 + Math.random() * 40;

    return {
      type,
      value,
      threat,
      confidence: Math.round(confidence),
      timestamp: new Date().toISOString(),
      indicators: this.getIndicators(threat)
    };
  }

  getIndicators(threat) {
    const indicators = {
      safe: ['Valid SSL certificate', 'Domain registered for 5+ years', 'No suspicious patterns detected'],
      suspicious: ['Recently registered domain', 'Unusual URL structure', 'Mixed security signals'],
      malicious: ['Spoofed domain detected', 'Known phishing patterns', 'Invalid SSL certificate', 'Blacklisted IP']
    };
    return indicators[threat] || [];
  }

  showScanResult(result) {
    const modal = document.createElement('div');
    modal.className = 'scan-result-modal';
    modal.innerHTML = `
      <div class="scan-result-content">
        <div class="scan-result-header">
          <h3>Scan Complete</h3>
          <button class="close-modal" id="scan-modal-close">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="scan-result-body">
          <div class="scan-result-badge badge-${result.threat}">${result.threat.toUpperCase()}</div>
          <div class="scan-result-confidence">${result.confidence}% Confidence</div>
          <div class="scan-result-value">${result.value}</div>
          <div class="scan-result-indicators">
            <h4>Detection Indicators:</h4>
            <ul>
              ${result.indicators.map(indicator => `<li>${indicator}</li>`).join('')}
            </ul>
          </div>
        </div>
        <div class="scan-result-footer">
          <button class="btn btn-primary" id="scan-modal-close-btn">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners for modal close buttons
    const closeBtn = modal.querySelector('#scan-modal-close');
    const closeBtnFooter = modal.querySelector('#scan-modal-close-btn');
    const closeModal = () => modal.remove();
    
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (closeBtnFooter) closeBtnFooter.addEventListener('click', closeModal);
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// ==================== FORM HANDLERS ====================
class FormManager {
  constructor() {
    this.setupLoginForm();
    this.setupSettingsForm();
    this.setupSignupForm(); // ensure signup handler runs if present
  }

  setupLoginForm() {
    // Handle login form on login.html page - two-stage: email -> password
    const loginForm = document.querySelector('#login-form');
    if (!loginForm || !window.location.pathname.includes('login.html')) return;

    const emailInput = document.querySelector('#email');
    const passwordInput = document.querySelector('#password');
    const emailFieldWrapper = document.querySelector('#emailFieldWrapper');
    const passwordFieldWrapper = document.querySelector('#passwordFieldWrapper');
    const emailError = document.querySelector('#emailError');
    const emailDisplay = document.querySelector('#emailDisplay');

    // Password toggle
    const loginPwToggle = document.querySelector('#loginPwToggle');

    // NEW: two separate auth link containers
    const authLinksEmail = document.querySelector('#authLinksEmail'); // shown only during email stage
    const authLinksFull = document.querySelector('#authLinksFull');   // shown only during password stage
    const loginLabel = document.querySelector('#login-label');
    const useDifferentEmail = document.querySelector('#useDifferentEmail');

    let passwordStage = false;

    function isValidEmail(value) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(value);
    }

    function showElement(el) {
      if (!el) return;
      el.classList.remove('animated-hidden');
      el.classList.remove('swipe-up-out');
      el.style.display = 'block';
      setTimeout(() => el.classList.add('swipe-up-in'), 10);
      el.setAttribute('aria-hidden', 'false');
    }

    function hideElementWithOut(el, cb) {
      if (!el) { if (cb) cb(); return; }
      el.classList.remove('swipe-up-in');
      el.classList.add('swipe-up-out');
      el.addEventListener('animationend', function handler() {
        el.style.display = 'none';
        el.classList.remove('swipe-up-out');
        el.removeEventListener('animationend', handler);
        if (cb) cb();
      });
    }

    function enterPasswordStage(emailVal) {
      passwordStage = true;
      if (emailDisplay) {
        emailDisplay.textContent = emailVal;
        emailDisplay.style.display = 'block';
        setTimeout(() => {
          emailDisplay.classList.remove('animated-hidden');
          emailDisplay.classList.add('swipe-up-in');
        }, 10);
        emailDisplay.setAttribute('aria-hidden', 'false');
      }
      if (emailFieldWrapper) hideElementWithOut(emailFieldWrapper);
      if (passwordFieldWrapper) {
        passwordFieldWrapper.style.display = 'block';
        setTimeout(() => showElement(passwordFieldWrapper), 20);
      }

      // SHOW full auth links (forgot + use diff + signup)
      if (authLinksEmail) {
        // hide the simple email-only links
        authLinksEmail.style.display = 'none';
        authLinksEmail.setAttribute('aria-hidden', 'true');
      }
      if (authLinksFull) {
        authLinksFull.style.display = 'block';
        authLinksFull.classList.remove('animated-hidden');
        authLinksFull.setAttribute('aria-hidden', 'false');
        setTimeout(() => authLinksFull.classList.add('swipe-up-in'), 10);
      }

      if (loginLabel) loginLabel.textContent = 'Enter your password:';
      setTimeout(() => { if (passwordInput) passwordInput.focus(); }, 50);
    }

    function backToEmailStage() {
      passwordStage = false;
      if (passwordFieldWrapper) {
        hideElementWithOut(passwordFieldWrapper, () => {
          if (emailFieldWrapper) { emailFieldWrapper.style.display = 'block'; setTimeout(() => showElement(emailFieldWrapper), 20); }
        });
      } else {
        if (emailFieldWrapper) { emailFieldWrapper.style.display = 'block'; setTimeout(() => showElement(emailFieldWrapper), 20); }
      }

      // hide email preview
      if (emailDisplay) {
        emailDisplay.classList.remove('swipe-up-in');
        emailDisplay.classList.add('swipe-up-out');
        emailDisplay.addEventListener('animationend', function hidePreview() {
          emailDisplay.classList.remove('swipe-up-out');
          emailDisplay.classList.add('animated-hidden');
          emailDisplay.style.display = 'none';
          emailDisplay.removeEventListener('animationend', hidePreview);
        });
      }

      // SHOW only the simple signup line, hide the full auth links
      if (authLinksFull) {
        authLinksFull.classList.remove('swipe-up-in');
        authLinksFull.classList.add('swipe-up-out');
        authLinksFull.addEventListener('animationend', function hideFull() {
          authLinksFull.style.display = 'none';
          authLinksFull.classList.add('animated-hidden');
          authLinksFull.classList.remove('swipe-up-out');
          authLinksFull.removeEventListener('animationend', hideFull);
        });
        authLinksFull.setAttribute('aria-hidden', 'true');
      }
      if (authLinksEmail) {
        authLinksEmail.style.display = 'block';
        authLinksEmail.classList.remove('animated-hidden');
        authLinksEmail.setAttribute('aria-hidden', 'false');
      }

      if (loginLabel) loginLabel.textContent = 'Enter your email address to sign in:';
      setTimeout(() => { if (emailInput) emailInput.focus(); }, 300);
    }

    // INITIAL STATE: show only simple signup line (authLinksEmail) and hide full links
    if (authLinksEmail) {
      authLinksEmail.style.display = 'block';
      authLinksEmail.classList.remove('animated-hidden');
      authLinksEmail.setAttribute('aria-hidden', 'false');
    }
    if (authLinksFull) {
      authLinksFull.style.display = 'none';
      authLinksFull.classList.add('animated-hidden');
      authLinksFull.setAttribute('aria-hidden', 'true');
    }

    if (useDifferentEmail) {
      useDifferentEmail.addEventListener('click', (ev) => { ev.preventDefault(); backToEmailStage(); });
    }

    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailVal = emailInput ? emailInput.value.trim() : (emailDisplay ? emailDisplay.textContent.trim() : '');
      const pwdVal = passwordInput ? passwordInput.value.trim() : '';

      if (!passwordStage) {
        if (!emailVal) {
          if (emailError) { emailError.style.display = 'block'; emailError.textContent = 'Email is required.'; } else showToast('Please enter your email address', 'error');
          if (emailInput) emailInput.focus();
          return;
        }
        if (!isValidEmail(emailVal)) {
          if (emailError) { emailError.style.display = 'block'; emailError.textContent = 'Please enter a valid email address (example: user@domain.com).'; } else showToast('Please enter a valid email address', 'error');
          if (emailInput) emailInput.focus();
          return;
        }
        if (emailError) emailError.style.display = 'none';
        enterPasswordStage(emailVal);
        return;
      }

      if (!pwdVal) {
        showToast('Please enter your password', 'error');
        if (passwordInput) passwordInput.focus();
        return;
      }

      // Attempt login
      const finalEmail = emailVal || (emailDisplay ? emailDisplay.textContent : '');
      
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';
      }

      auth.login(finalEmail, pwdVal)
        .then(() => {
          showToast('Login successful!', 'success');
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 500);
        })
        .catch((error) => {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Continue';
          }
          showToast(error.message || 'Login failed. Please check your credentials', 'error');
          if (passwordInput) passwordInput.focus();
        });
    });

    if (emailInput) {
      emailInput.addEventListener('input', () => { if (emailError && emailError.style.display !== 'none') emailError.style.display = 'none'; });
    }

    // Password toggle functionality
    if (loginPwToggle && passwordInput) {
      loginPwToggle.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        loginPwToggle.classList.toggle('active', !isPassword);
      });
    }
  }

  setupSignupForm() {
    // Signup page handling: validate fields and create profile
    const signupForm = document.querySelector('#signup-form');
    if (!signupForm || !window.location.pathname.includes('signup.html')) return;

    const fName = document.querySelector('#firstName');
    const lName = document.querySelector('#lastName');
    const email = document.querySelector('#signup-email');
    const phone = document.querySelector('#phone');
    const company = document.querySelector('#company');
    const securityQuestion = document.querySelector('#securityQuestion');
    const securityAnswer = document.querySelector('#securityAnswer');
    const pwd = document.querySelector('#signup-password');
    const confirm = document.querySelector('#signup-confirm');
    const emailError = document.querySelector('#signupEmailError');
    const pwdError = document.querySelector('#signupPasswordError');

    // UI elements for strength meter
    const bar1 = document.getElementById('pwdBar1');
    const bar2 = document.getElementById('pwdBar2');
    const bar3 = document.getElementById('pwdBar3');
    const bar4 = document.getElementById('pwdBar4');
    const strengthText = document.getElementById('pwdStrength');
    const meter = document.getElementById('pwdMeter');

    // password toggles
    const signupPwToggle = document.getElementById('signupPwToggle');
    const signupConfirmPwToggle = document.getElementById('signupConfirmPwToggle');

    function isValidEmail(value) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(value);
    }

    // password strength scoring:
    // score 0..4 => Weak, Fair, Good, Strong
    function passwordScore(pass) {
      let score = 0;
      if (!pass || pass.length < 1) return 0;
      // length >=6
      if (pass.length >= 6) score++;
      // has lowercase & uppercase
      if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score++;
      // has digits
      if (/\d/.test(pass)) score++;
      // has special char
      if (/[^A-Za-z0-9]/.test(pass)) score++;
      return score;
    }

    function updateStrengthUI(pass) {
      const s = passwordScore(pass);

      // reset
      [bar1, bar2, bar3, bar4].forEach(b => b && (b.style.background = 'rgba(255,255,255,0.06)'));

      // colours you requested
      const COLOR_WEAK   = '#FF4D4D';   // red
      const COLOR_FAIR   = '#FF8A00';   // orange
      const COLOR_GOOD   = '#FFD600';   // yellow
      const COLOR_STRONG = '#00C853';   // green

      if (s >= 1 && bar1) bar1.style.background = COLOR_WEAK;
      if (s >= 2 && bar2) bar2.style.background = COLOR_FAIR;
      if (s >= 3 && bar3) bar3.style.background = COLOR_GOOD;
      if (s >= 4 && bar4) bar4.style.background = COLOR_STRONG;

      // update textual label and meter class (optional)
      let label = '—';
      meter.classList.remove('weak','fair','good','strong');
      if (s <= 1) { label = 'Weak'; strengthText.style.color = COLOR_WEAK; meter.classList.add('weak'); }
      else if (s === 2) { label = 'Fair'; strengthText.style.color = COLOR_FAIR; meter.classList.add('fair'); }
      else if (s === 3) { label = 'Good'; strengthText.style.color = COLOR_GOOD; meter.classList.add('good'); }
      else if (s === 4) { label = 'Strong'; strengthText.style.color = COLOR_STRONG; meter.classList.add('strong'); }

      strengthText.textContent = label;
      return s;
    }

    // password toggle functionality
    if (signupPwToggle && pwd) {
      signupPwToggle.addEventListener('click', () => {
        const isPassword = pwd.type === 'password';
        pwd.type = isPassword ? 'text' : 'password';
        signupPwToggle.classList.toggle('active', !isPassword);
      });
    }
    if (signupConfirmPwToggle && confirm) {
      signupConfirmPwToggle.addEventListener('click', () => {
        const isPassword = confirm.type === 'password';
        confirm.type = isPassword ? 'text' : 'password';
        signupConfirmPwToggle.classList.toggle('active', !isPassword);
      });
    }

    // live strength update
    if (pwd) {
      pwd.addEventListener('input', () => {
        const score = updateStrengthUI(pwd.value);
        if (pwdError && pwdError.style.display !== 'none') pwdError.style.display = 'none';
        if (confirm && pwd.value === confirm.value && pwdError) { pwdError.style.display = 'none'; }
      });
    }

    if (confirm) {
      confirm.addEventListener('input', () => {
        if (pwdError && pwdError.style.display !== 'none') pwdError.style.display = 'none';
      });
    }

    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const first = fName ? fName.value.trim() : '';
      const last = lName ? lName.value.trim() : '';
      const em = email ? email.value.trim() : '';
      const ph = phone ? phone.value.trim() : '';
      const comp = company ? company.value.trim() : '';
      const secQ = securityQuestion ? securityQuestion.value : '';
      const secA = securityAnswer ? securityAnswer.value.trim() : '';
      const pw = pwd ? pwd.value : '';
      const conf = confirm ? confirm.value : '';

      if (!first) { showToast('Please enter your first name', 'error'); if (fName) fName.focus(); return; }
      if (!last) { showToast('Please enter your last name', 'error'); if (lName) lName.focus(); return; }

      if (!em) {
        if (emailError) { emailError.style.display = 'block'; emailError.textContent = 'Email is required.'; }
        else showToast('Please enter your email address', 'error');
        if (email) email.focus();
        return;
      }

      if (!isValidEmail(em)) {
        if (emailError) { emailError.style.display = 'block'; emailError.textContent = 'Please enter a valid email address (e.g. user@domain.com).'; }
        else showToast('Please enter a valid email address', 'error');
        if (email) email.focus();
        return;
      } else if (emailError) {
        emailError.style.display = 'none';
      }

      if (!secQ) { showToast('Please select a security question', 'error'); if (securityQuestion) securityQuestion.focus(); return; }
      if (!secA) { showToast('Please provide an answer to the security question', 'error'); if (securityAnswer) securityAnswer.focus(); return; }

      // password checks
      if (!pw || pw.length < 6) {
        if (pwdError) { pwdError.style.display = 'block'; pwdError.textContent = 'Password must be at least 6 characters.'; }
        else showToast('Password must be at least 6 characters', 'error');
        if (pwd) pwd.focus();
        return;
      }

      const score = passwordScore(pw);
      // require Good -> score >=3
      if (score < 3) {
        if (pwdError) { pwdError.style.display = 'block'; pwdError.textContent = 'Password strength is not good enough. Make it stronger (uppercase, lowercase, digit or symbol).'; }
        else showToast('Password is not strong enough', 'error');
        if (pwd) pwd.focus();
        updateStrengthUI(pw);
        return;
      }

      if (pw !== conf) {
        if (pwdError) { pwdError.style.display = 'block'; pwdError.textContent = 'Passwords do not match.'; }
        else showToast('Passwords do not match', 'error');
        if (confirm) confirm.focus();
        return;
      } else if (pwdError) {
        pwdError.style.display = 'none';
      }

      // Register new user (demo mode)
      const submitBtn = signupForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';
      }

      auth.register({
        firstName: first,
        lastName: last,
        email: em,
        phone: ph,
        company: comp,
        securityQuestion: secQ,
        securityAnswer: secA,
        password: pw,
        confirmPassword: conf
      })
      .then(() => {
        showToast('Account created successfully!', 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 500);
      })
      .catch((error) => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Account';
        }
        if (emailError) {
          emailError.style.display = 'block';
          emailError.textContent = error.message || 'Registration failed. Please try again.';
        } else {
          showToast(error.message || 'Registration failed. Please try again', 'error');
        }
      });
    });
  }

  setupSettingsForm() {
    const settingsForm = document.querySelector('#settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        showToast('Settings saved successfully! (Demo mode)', 'success');
      });
    }
  }
}

// ==================== INITIALIZE ON PAGE LOAD ====================
document.addEventListener('DOMContentLoaded', () => {
  const nav = new NavigationManager();
  const scanner = new ScanManager();
  const forms = new FormManager();

  // Note: NavigationManager.init() calls refreshProfileAndUpdate() 
  // which will fetch fresh user data including avatar from server
  // window.currentUserAvatar will be set by refreshProfile() method

  // Force avatar update after navigation loads
  setTimeout(() => {
    const userAvatar = document.querySelector('.user-avatar');
    const userObj = window.auth.getUser();
    
    // ONLY use window.currentUserAvatar which is set by refreshProfile() from fresh server data
    // Do NOT fall back to user.avatar from localStorage as it's stale
    const savedAvatar = window.currentUserAvatar;
    const savedFitMode = localStorage.getItem('avatarFitMode') || (userObj && userObj.avatarFit) || 'cover';
  
    console.log('Avatar display:', {
      hasUserAvatar: !!userAvatar,
      hasSavedAvatar: !!savedAvatar,
      isLoggedIn: !!userObj,
      usingWindowAvatar: !!window.currentUserAvatar,
      isDataURL: savedAvatar ? savedAvatar.startsWith('data:') : false
    });
  
    if (userAvatar && userObj && savedAvatar) {
      console.log('Displaying fresh avatar from server');
      let urlToUse = savedAvatar;
      if (!savedAvatar.startsWith('data:')) {
        const cacheId = new Date().getTime();
        urlToUse = savedAvatar.includes('?') ? `${savedAvatar}&t=${cacheId}` : `${savedAvatar}?t=${cacheId}`;
      }
      userAvatar.style.backgroundImage = '';
      userAvatar.style.backgroundImage = `url(${urlToUse})`;
      userAvatar.style.setProperty('background-size', savedFitMode, 'important');
      userAvatar.style.backgroundPosition = 'center';
      userAvatar.style.backgroundRepeat = 'no-repeat';
      userAvatar.textContent = '';
    } else if (userAvatar && userObj) {
      // If no avatar, show initials
      userAvatar.style.backgroundImage = '';
      userAvatar.textContent = userObj.initials || 'JD';
    }
  }, 800);  // Wait longer to ensure server fetch completes

  // Setup FAQ accordions
  document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
      const item = question.closest('.faq-item');
      item.classList.toggle('active');
    });
  });
});

// ==================== HERO TYPEWRITER ====================
(function() {
  try {
    const path = window.location.pathname.split('/').pop();
    if (!(path === '' || path === 'index.html' || path === '/')) return;

    const target = document.getElementById('hero-typewriter');
    const cursor = document.querySelector('.type-cursor');

    if (!target) {
      if (cursor) cursor.style.display = 'none';
      return;
    }

    // Make cursor visible before typing
    if (cursor) {
      cursor.style.display = 'inline-block';
      cursor.style.opacity = '1';
    }

    const fullText = target.getAttribute('data-text') || target.textContent.trim();
    target.textContent = ''; // start empty

    let i = 0;
    const speed = 30;

    function typeStep() {
      if (i < fullText.length) {
        target.textContent += fullText.charAt(i);
        i++;
        setTimeout(typeStep, speed);
      } else {
        // Hide cursor when done
        if (cursor) {
          cursor.style.transition = 'opacity 120ms linear';
          cursor.style.opacity = '0';
          setTimeout(() => { cursor.style.display = 'none'; }, 140);
        }
      }
    }

    setTimeout(typeStep, 350);
  } catch (err) {
    console.error('Typewriter error:', err);
  }
})();
