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
    return localStorage.getItem(this.storageKey) !== null;
  }

  login(email) {
    const user = {
      email: email,
      initials: this.getInitials(email),
      loginTime: new Date().toISOString()
    };
    localStorage.setItem(this.storageKey, JSON.stringify(user));
    return user;
  }

  logout() {
    localStorage.removeItem(this.storageKey);
    window.location.href = 'index.html';
  }

  getUser() {
    const userData = localStorage.getItem(this.storageKey);
    return userData ? JSON.parse(userData) : null;
  }

  getInitials(email) {
    const name = email.split('@')[0];
    const parts = name.split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
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

        // 🔴 Hide extra dashboard button (even on landing page)
        if (dashboardButton) dashboardButton.style.display = 'none';
      } else {
        authButtons.style.display = 'flex';
        userAvatar.style.display = 'none';

        // 🟢 Show dashboard button only for guests
        if (dashboardButton) dashboardButton.style.display = 'inline-flex';
      }
    }

    // Apply logged-in class for global styling
    document.body.classList.toggle('logged-in', isLoggedIn);

    // 🧠 Safety check for landing page late load
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
    // Dashboard button click handler
    const dashboardButtons = document.querySelectorAll('.btn-dashboard, [href="dashboard.html"]');
    dashboardButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (!auth.isLoggedIn()) {
          e.preventDefault();
          window.location.href = 'signup.html';
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

  handleScan(input, type) {
    const value = input.value.trim();

    if (!value) {
      this.showNotification('Please enter a ' + type + ' to scan', 'error');
      return;
    }

    // Check if guest can scan
    if (!auth.isLoggedIn() && !auth.canScanAsGuest()) {
      this.showNotification('Sign up to continue scanning', 'warning');
      setTimeout(() => {
        window.location.href = 'signup.html';
      }, 2000);
      return;
    }

    // Simulate scan
    this.showNotification('Scanning ' + type + '...', 'info');

    setTimeout(() => {
      const result = this.simulateScan(value, type);
      auth.incrementScanCount();
      this.showScanResult(result);
    }, 1500);
  }

  simulateScan(value, type) {
    // Simulate AI scan with random but realistic results
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
    this.setupSignupForm();
    this.setupSettingsForm();
  }

  setupLoginForm() {
    const loginForm = document.querySelector('.auth-card form');
    if (loginForm && window.location.pathname.includes('login.html')) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.querySelector('#email').value;
        const password = document.querySelector('#password').value;

        if (email && password) {
          auth.login(email);
          window.location.href = 'dashboard.html';
        }
      });
    }
  }

  setupSignupForm() {
    const signupForm = document.querySelector('.auth-card form');
    if (signupForm && window.location.pathname.includes('signup.html')) {
      signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.querySelector('#email').value;
        const password = document.querySelector('#password').value;
        const confirmPassword = document.querySelector('#confirm-password').value;

        if (password !== confirmPassword) {
          alert('Passwords do not match');
          return;
        }

        if (email && password) {
          auth.login(email);
          window.location.href = 'dashboard.html';
        }
      });
    }
  }

  setupSettingsForm() {
    const settingsForm = document.querySelector('#settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Settings saved successfully! (Demo mode - changes not persisted)');
      });
    }
  }
}
// === Password toggle (minimal) ===
(function () {
  const toggles = Array.from(document.querySelectorAll('.pw-toggle'));
  if (!toggles.length) return;

  toggles.forEach(btn => {
    const targetId = btn.getAttribute('data-target');
    let input = targetId ? document.getElementById(targetId) : null;
    if (!input) {
      const parent = btn.closest('.input-with-toggle') || btn.closest('.form-group');
      input = parent ? parent.querySelector('.password-field, input[type="password"]') : null;
    }
    if (!input) return;

    // initial icon state
    updateButtonState(btn, input);

    btn.addEventListener('click', () => {
      const wasHidden = input.type === 'password';
      input.type = wasHidden ? 'text' : 'password';
      updateButtonState(btn, input);
      input.focus();
      try {
        const val = input.value || '';
        input.setSelectionRange(val.length, val.length);
      } catch (e) {}
    });
  });

  function updateButtonState(btn, input) {
    const isHidden = input.type === 'password';
    btn.setAttribute('aria-label', isHidden ? 'Show password' : 'Hide password');
    btn.title = isHidden ? 'Show password' : 'Hide password';
    const vis = btn.querySelector('.eye-visible');
    const hid = btn.querySelector('.eye-hidden');
    if (vis && hid) {
      vis.style.display = isHidden ? 'block' : 'none';
      hid.style.display = isHidden ? 'none' : 'block';
    }
  }
})();


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
