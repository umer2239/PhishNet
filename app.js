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
  
  // Set message and type
  toastElement.textContent = message;
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

// ==================== LOGIN STATE MANAGEMENT ====================
// Prevent dashboard button flash for logged-in users
if (localStorage.getItem('pishnet_user')) {
  document.body.classList.add('logged-in');
}

class AuthManager {
  constructor() {
    this.storageKey = 'phishnet_user';
    this.scanCountKey = 'phishnet_scan_count';
  }

  isLoggedIn() {
    // Check if we have a valid token
    return apiService.isAuthenticated() && localStorage.getItem(this.storageKey) !== null;
  }

  async login(email, password) {
    try {
      const response = await apiService.login({ email, password });
      
      if (response.success) {
        const user = {
          email: response.user.email,
          firstName: response.user.firstName,
          lastName: response.user.lastName,
          initials: this.getInitials(response.user.email, response.user.firstName, response.user.lastName),
          loginTime: new Date().toISOString()
        };
        localStorage.setItem(this.storageKey, JSON.stringify(user));
        // Also set as pishnet_user for backward compatibility
        localStorage.setItem('pishnet_user', JSON.stringify(user));
        return user;
      }
      throw new Error(response.message || 'Login failed');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout() {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem('pishnet_user');
      window.location.href = 'index.html';
    }
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

  async setProfile(profile) {
    // profile: {firstName, lastName, email}
    try {
      if (this.isLoggedIn()) {
        // Update profile on backend
        await apiService.updateProfile(profile);
      }
      const user = Object.assign({}, this.getUser() || {}, profile);
      if (profile.firstName || profile.lastName) {
        user.initials = this.getInitials(profile.email || user.email, profile.firstName, profile.lastName);
      }
      localStorage.setItem(this.storageKey, JSON.stringify(user));
      localStorage.setItem('pishnet_user', JSON.stringify(user));
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
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

  async register(userData) {
    try {
      const response = await apiService.register(userData);
      
      if (response.success) {
        const user = {
          email: response.user.email,
          firstName: response.user.firstName,
          lastName: response.user.lastName,
          initials: this.getInitials(response.user.email, response.user.firstName, response.user.lastName),
          loginTime: new Date().toISOString()
        };
        localStorage.setItem(this.storageKey, JSON.stringify(user));
        localStorage.setItem('pishnet_user', JSON.stringify(user));
        return user;
      }
      throw new Error(response.message || 'Registration failed');
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }
}

const auth = new AuthManager();

// ==================== NAVIGATION MANAGEMENT ====================
class NavigationManager {
  constructor() {
    this.init();
  }

  init() {
    this.updateNavigation();
    this.setupEventListeners();
    this.setupDropdowns();
  }

  updateNavigation() {
    const isLoggedIn = auth.isLoggedIn();

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

        const user = auth.getUser();
        userAvatar.textContent = user.initials;

        // Hide extra dashboard button (even on landing page)
        if (dashboardButton) dashboardButton.style.display = 'none';
      } else {
        authButtons.style.display = 'flex';
        userAvatar.style.display = 'none';

        // Show dashboard button only for guests
        if (dashboardButton) dashboardButton.style.display = 'inline-flex';
      }
    }

    // Apply logged-in class for global styling
    document.body.classList.toggle('logged-in', isLoggedIn);

    // Safety check for landing page late load
    if (isLoggedIn && window.location.pathname.includes('index.html')) {
      setTimeout(() => {
        const landingDashboardBtn = document.querySelector('.btn-dashboard');
        if (landingDashboardBtn) landingDashboardBtn.style.display = 'none';
      }, 300);
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

    navLinks.innerHTML = `
     <li><a href="pricing.html" ${currentPage === 'pricing.html' ? 'class="active"' : ''}>Pricing</a></li>
     <li><a href="demo.html" ${currentPage === 'demo.html' ? 'class="active"' : ''}>Demo</a></li>
      <li><a href="blog.html" ${currentPage === 'blog.html' ? 'class="active"' : ''}>Blog</a></li>
      <li class="dropdown">
        <a href="#" class="dropdown-toggle ${currentPage === 'about.html' || currentPage === 'faq.html' || currentPage === 'terms.html' || currentPage === 'privacy.html' ? 'active"' : ''}">
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

  setupEventListeners() {
    // Dashboard button click handler - redirect to login if not logged in
    const dashboardButtons = document.querySelectorAll('.btn-dashboard, [href="dashboard.html"]');
    dashboardButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (!auth.isLoggedIn()) {
          e.preventDefault();
          window.location.href = 'login.html';
        }
      });
    });

    // User avatar click handler
    const userAvatar = document.querySelector('.user-avatar');
    if (userAvatar) {
      userAvatar.addEventListener('click', () => {
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

    const menu = document.createElement('div');
    menu.className = 'profile-menu';
    menu.innerHTML = `
      <div class="profile-menu-header">
        <div class="profile-menu-avatar">${auth.getUser().initials}</div>
        <div class="profile-menu-info">
          <div class="profile-menu-email">${auth.getUser().email}</div>
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
      <button class="profile-menu-item" onclick="auth.logout()">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Logout
      </button>
    `;

    const userAvatar = document.querySelector('.user-avatar');
    userAvatar.appendChild(menu);

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

  async handleScan(input, type) {
    const value = input.value.trim();

    if (!value) {
      this.showNotification('Please enter a ' + type + ' to scan', 'error');
      return;
    }

    // Check if guest can scan - redirect to login if scan limit reached
    if (!auth.isLoggedIn() && !auth.canScanAsGuest()) {
      this.showNotification('Login to continue scanning', 'warning');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
      return;
    }

    // Show scanning notification
    this.showNotification('Scanning ' + type + '...', 'info');

    try {
      let result;
      
      // If logged in, use backend API
      if (auth.isLoggedIn()) {
        const scanData = type === 'url' ? { url: value } : { emailContent: value };
        const response = await apiService.createScan(scanData);
        
        if (response.success) {
          result = {
            type,
            value,
            threat: response.scan.threatLevel,
            confidence: response.scan.confidence,
            timestamp: response.scan.createdAt,
            indicators: response.scan.threatIndicators || this.getIndicators(response.scan.threatLevel)
          };
        } else {
          throw new Error('Scan failed');
        }
      } else {
        // Guest mode - simulate scan
        result = this.simulateScan(value, type);
      }
      
      auth.incrementScanCount();
      this.showScanResult(result);
    } catch (error) {
      console.error('Scan error:', error);
      this.showNotification('Scan failed. Please try again.', 'error');
    }
  }

  simulateScan(value, type) {
    // Simulate AI scan with random but realistic results (for guest users)
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
          <button class="close-modal" onclick="this.closest('.scan-result-modal').remove()">
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
          <button class="btn btn-primary" onclick="this.closest('.scan-result-modal').remove()">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
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
      setTimeout(() => { if (passwordInput) passwordInput.focus(); }, 420);
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

      // Attempt login with backend API
      const finalEmail = emailVal || (emailDisplay ? emailDisplay.textContent : '');
      auth.login(finalEmail, pwdVal)
        .then(() => {
          window.location.href = 'dashboard.html';
        })
        .catch((error) => {
          showToast(error.message || 'Login failed. Please check your credentials', 'error');
          if (passwordInput) passwordInput.focus();
        });
    });

    if (emailInput) {
      emailInput.addEventListener('input', () => { if (emailError && emailError.style.display !== 'none') emailError.style.display = 'none'; });
    }
  }

  setupSignupForm() {
    // Signup page handling: validate fields and create profile
    const signupForm = document.querySelector('#signup-form');
    if (!signupForm || !window.location.pathname.includes('signup.html')) return;

    const fName = document.querySelector('#firstName');
    const lName = document.querySelector('#lastName');
    const email = document.querySelector('#signup-email');
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

    // show passwords checkbox
    const showPasswords = document.getElementById('showPasswords');

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

    // show/hide both password fields using checkbox
    if (showPasswords) {
      showPasswords.addEventListener('change', () => {
        const t = showPasswords.checked ? 'text' : 'password';
        if (pwd) pwd.setAttribute('type', t);
        if (confirm) confirm.setAttribute('type', t);
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

      // Register with backend API
      auth.register({
        firstName: first,
        lastName: last,
        email: em,
        password: pw,
        confirmPassword: conf
      })
      .then(() => {
        // redirect to dashboard on successful registration
        window.location.href = 'dashboard.html';
      })
      .catch((error) => {
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

  // Setup FAQ accordions
  document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
      const item = question.closest('.faq-item');
      item.classList.toggle('active');
    });
  });
});

// Make auth available globally for inline event handlers
window.auth = auth;
// ==================== HERO TYPEWRITER (ALWAYS RUN) ====================
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
