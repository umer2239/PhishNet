// Settings Page Functionality

// Avatar Upload and Preview
const avatarFile = document.getElementById('avatarFile');
const avatarUploadBtn = document.getElementById('avatarUploadBtn');
const avatarRemoveBtn = document.getElementById('avatarRemoveBtn');
const settingsAvatarPreview = document.getElementById('settingsAvatarPreview');
const avatarFitMode = document.getElementById('avatarFitMode');
const avatarUploadStatus = document.getElementById('avatarUploadStatus');

let currentAvatarURL = null;

const tokenKey = 'token';
const apiBase = '/api';

// Debounce helper to prevent rapid API calls
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Compress image to reduce file size (200x200px max, high quality)
async function compressImage(dataUrl, maxSize = 50 * 1024) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Resize to max 200x200 while maintaining aspect ratio
      const maxDimension = 200;
      if (width > height) {
        if (width > maxDimension) {
          height = Math.round(height * (maxDimension / width));
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = Math.round(width * (maxDimension / height));
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Try multiple quality levels to stay under maxSize
      let quality = 0.9;
      let result = canvas.toDataURL('image/jpeg', quality);

      while (result.length > maxSize && quality > 0.1) {
        quality -= 0.1;
        result = canvas.toDataURL('image/jpeg', quality);
      }

      resolve(result);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

async function authFetch(url, options = {}) {
  const token = localStorage.getItem(tokenKey);
  if (!token) {
    throw new Error('You need to be logged in to update your profile.');
  }

  const headers = Object.assign({}, options.headers || {}, {
    Authorization: `Bearer ${token}`,
  });

  const response = await fetch(url, Object.assign({}, options, { headers }));
  if (!response.ok) {
    let message = 'Request failed';
    try {
      const err = await response.json();
      message = err.message || message;
    } catch {}
    throw new Error(message);
  }
  return response.json();
}

function syncUserState(user) {
  if (!user) return;
  if (window.auth && typeof window.auth.setProfile === 'function') {
    window.auth.setProfile({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarFit: user.avatarFit || 'cover',
    });
    // Store avatar in window object instead of localStorage to avoid quota issues
    if (user.avatar) {
      window.currentUserAvatar = user.avatar;
    } else {
      window.currentUserAvatar = null;
    }
  }
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('pishnet_user') || localStorage.getItem('phishnet_currentUser') || localStorage.getItem('currentUser') || '{}');
  } catch {
    return {};
  }
}

// Trigger file input when upload button clicked
avatarUploadBtn?.addEventListener('click', () => {
  avatarFile.click();
});

// Handle avatar file selection
avatarFile?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) { // 5MB limit
    showNotification('Image size must be less than 5MB', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      // Show loading spinner
      if (avatarUploadStatus) {
        avatarUploadStatus.classList.add('active');
      }
      if (avatarUploadBtn) {
        avatarUploadBtn.disabled = true;
      }
      if (avatarRemoveBtn) {
        avatarRemoveBtn.disabled = true;
      }

      let dataUrl = event.target.result;
      
      // Compress image before uploading
      dataUrl = await compressImage(dataUrl, 50 * 1024);
      
      currentAvatarURL = dataUrl;
      window.currentUserAvatar = dataUrl;
      const fitMode = avatarFitMode?.value || 'cover';
      updateAvatarPreview(currentAvatarURL, fitMode);

      const result = await authFetch(`${apiBase}/users/profile/avatar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: dataUrl, fitMode: avatarFitMode.value }),
      });

      if (result?.data?.user) {
        syncUserState(result.data.user);
        cacheProfileData(result.data.user); // Update cache after upload
      }

      updateHeaderAvatar(currentAvatarURL, avatarFitMode.value);
      showNotification('Profile picture uploaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      showNotification(err.message || 'Failed to upload profile picture', 'error');
    } finally {
      // Hide loading spinner and re-enable buttons
      if (avatarUploadStatus) {
        avatarUploadStatus.classList.remove('active');
      }
      if (avatarUploadBtn) {
        avatarUploadBtn.disabled = false;
      }
      if (avatarRemoveBtn) {
        avatarRemoveBtn.disabled = false;
      }
      avatarFile.value = '';
    }
  };
  reader.readAsDataURL(file);
});


// Update avatar preview
function updateAvatarPreview(imageURL, fitMode = null) {
  if (imageURL) {
    const mode = fitMode || avatarFitMode?.value || 'cover';
    settingsAvatarPreview.style.backgroundImage = `url(${imageURL})`;
    settingsAvatarPreview.style.setProperty('background-size', mode, 'important');
    settingsAvatarPreview.style.backgroundPosition = 'center';
    settingsAvatarPreview.style.backgroundRepeat = 'no-repeat';
    settingsAvatarPreview.textContent = '';
  } else {
    const user = getStoredUser();
    let initials = 'JD';

    if (user.initials) {
      initials = user.initials;
    } else if (user.firstName && user.lastName) {
      initials = (user.firstName[0] + user.lastName[0]).toUpperCase();
    } else if (user.name) {
      initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
    }

    settingsAvatarPreview.style.backgroundImage = '';
    settingsAvatarPreview.textContent = initials;
  }
}

// Update header avatar across all pages
function updateHeaderAvatar(imageURL, fitMode) {
  const headerAvatar = document.querySelector('.user-avatar');
  if (!headerAvatar) return;
  
  if (imageURL) {
    headerAvatar.style.backgroundImage = `url(${imageURL})`;
    headerAvatar.style.setProperty('background-size', fitMode || 'cover', 'important');
    headerAvatar.style.backgroundPosition = 'center';
    headerAvatar.style.backgroundRepeat = 'no-repeat';
    headerAvatar.textContent = '';
  } else {
    const user = window.auth?.getUser?.() || getStoredUser();
    let initials = 'JD';

    if (user.initials) {
      initials = user.initials;
    } else if (user.firstName && user.lastName) {
      initials = (user.firstName[0] + user.lastName[0]).toUpperCase();
    } else if (user.name) {
      initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
    }

    headerAvatar.style.backgroundImage = '';
    headerAvatar.textContent = initials;
  }
}

// Avatar fit mode change - debounced to prevent rapid API calls
const saveFitMode = debounce(async (fitMode) => {
  try {
    await authFetch(`${apiBase}/users/profile/avatar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fitMode: fitMode }),
    });
  } catch (err) {
    console.error('Error saving avatar fit mode:', err);
  }
}, 500);

avatarFitMode?.addEventListener('change', async () => {
  if (currentAvatarURL) {
    const fitMode = avatarFitMode.value;
    updateAvatarPreview(currentAvatarURL, fitMode);
    updateHeaderAvatar(currentAvatarURL, fitMode);
    
    // Save the fit mode to backend with debouncing
    saveFitMode(fitMode);
  }
});

// Remove avatar
avatarRemoveBtn?.addEventListener('click', async () => {
  try {
    // Show loading spinner
    if (avatarUploadStatus) {
      avatarUploadStatus.classList.add('active');
      const spanEl = avatarUploadStatus.querySelector('span');
      if (spanEl) spanEl.textContent = 'Removing...';
    }
    if (avatarUploadBtn) {
      avatarUploadBtn.disabled = true;
    }
    if (avatarRemoveBtn) {
      avatarRemoveBtn.disabled = true;
    }

    const result = await authFetch(`${apiBase}/users/profile/avatar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remove: true }),
    });

    currentAvatarURL = null;
    window.currentUserAvatar = null;
    localStorage.removeItem('userAvatar');
    localStorage.removeItem('avatarFitMode');
    avatarFile.value = '';
    updateAvatarPreview(null);
    updateHeaderAvatar(null, null);

    if (result?.data?.user) {
      syncUserState(result.data.user);
      cacheProfileData(result.data.user); // Update cache after removal
    }

    showNotification('Profile picture removed', 'success');
  } catch (err) {
    console.error(err);
    showNotification(err.message || 'Failed to remove profile picture', 'error');
  } finally {
    // Hide loading spinner and re-enable buttons
    if (avatarUploadStatus) {
      avatarUploadStatus.classList.remove('active');
      const spanEl = avatarUploadStatus.querySelector('span');
      if (spanEl) spanEl.textContent = 'Uploading...';
    }
    if (avatarUploadBtn) {
      avatarUploadBtn.disabled = false;
    }
    if (avatarRemoveBtn) {
      avatarRemoveBtn.disabled = false;
    }
  }
});

// Define all functions first
async function loadAndSyncProfile() {
  try {
    // Check sessionStorage cache first for instant loading
    const cachedUser = sessionStorage.getItem('phishnet_profile_cache');
    if (cachedUser) {
      const user = JSON.parse(cachedUser);
      applyProfileToFormImmediate(user);
      // Still fetch fresh data in background without blocking UI
      fetchAndSyncProfileInBackground();
    } else {
      // No cache, fetch from server
      const result = await authFetch(`${apiBase}/users/profile`);
      const user = result?.data?.user || getStoredUser();
      syncUserState(user);
      cacheProfileData(user);
      applyProfileToFormImmediate(user);
    }
  } catch (err) {
    console.error(err);
    // fall back to stored user
    applyProfileToForm(getStoredUser());
  }
}

// Fetch profile data in the background without blocking UI
async function fetchAndSyncProfileInBackground() {
  try {
    const result = await authFetch(`${apiBase}/users/profile`);
    const user = result?.data?.user;
    if (user) {
      syncUserState(user);
      cacheProfileData(user);
      // Only update form if it hasn't been manually edited
      applyProfileToForm(user);
    }
  } catch (err) {
    console.error('Background sync error:', err);
  }
}

// Cache profile data in sessionStorage for instant subsequent loads
function cacheProfileData(user) {
  try {
    sessionStorage.setItem('phishnet_profile_cache', JSON.stringify(user));
  } catch (err) {
    console.error('Cache error:', err);
  }
}

// Apply profile to form fields immediately (fast)
function applyProfileToFormImmediate(user = {}) {
  if (!user) return;
  const firstNameEl = document.getElementById('firstName');
  const lastNameEl = document.getElementById('lastName');
  const emailEl = document.getElementById('email');

  if (user.avatar) {
    const fitMode = user.avatarFit || 'cover';
    currentAvatarURL = user.avatar;
    window.currentUserAvatar = user.avatar;
    // Set dropdown value FIRST
    if (avatarFitMode) {
      avatarFitMode.value = fitMode;
    }
    // Then update preview with the correct fitMode
    updateAvatarPreview(user.avatar, fitMode);
    updateHeaderAvatar(user.avatar, fitMode);
  } else {
    currentAvatarURL = null;
    window.currentUserAvatar = null;
    updateAvatarPreview(null);
    updateHeaderAvatar(null, null);
  }

  if (firstNameEl && user.firstName) firstNameEl.value = user.firstName;
  if (lastNameEl && user.lastName) lastNameEl.value = user.lastName;
  if (emailEl && user.email) {
    emailEl.value = user.email;
    emailEl.setAttribute('readonly', 'readonly');
    emailEl.style.opacity = '0.7';
    emailEl.style.cursor = 'not-allowed';
  }
}

function applyProfileToForm(user = {}) {
  if (user.firstName) document.getElementById('firstName').value = user.firstName;
  if (user.lastName) document.getElementById('lastName').value = user.lastName;
  if (user.email) {
    document.getElementById('email').value = user.email;
    document.getElementById('email').setAttribute('readonly', 'readonly');
    document.getElementById('email').style.opacity = '0.7';
    document.getElementById('email').style.cursor = 'not-allowed';
  }
}

function loadNotificationPreferences() {
  const preferences = JSON.parse(localStorage.getItem('notificationPreferences') || '{}');
  
  notificationToggles.forEach(toggle => {
    const label = toggle.dataset.label;
    if (preferences.hasOwnProperty(label)) {
      toggle.checked = preferences[label];
    }
  });
}

function loadUserPreferences() {
  const preferences = JSON.parse(localStorage.getItem('userPreferences') || '{}');
  
  if (preferences.timezone) {
    document.getElementById('timezone').value = preferences.timezone;
  }
  if (preferences.language) {
    document.getElementById('language').value = preferences.language;
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: ${type === 'success' ? 'var(--color-safe)' : type === 'error' ? 'var(--color-malicious)' : 'var(--primary-blue)'};
    color: white;
    border-radius: var(--radius-md);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    max-width: 400px;
    font-size: 0.9375rem;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Initialize page on DOMContentLoaded
window.addEventListener('DOMContentLoaded', async () => {
  // Use Promise.all to parallelize independent API calls and local storage loads
  // This makes the page feel much faster
  try {
    await Promise.all([
      loadAndSyncProfile().catch(err => {
        console.error('Profile load error:', err);
        // Fallback to stored user if API fails
        applyProfileToForm(getStoredUser());
      }),
      // Load preferences asynchronously (doesn't block other operations)
      (async () => {
        loadNotificationPreferences();
        loadUserPreferences();
      })()
    ]);
  } catch (err) {
    console.error('Initialization error:', err);
  }
});


// Email validation helper
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Notification helper
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: ${type === 'success' ? 'var(--color-safe)' : type === 'error' ? 'var(--color-malicious)' : 'var(--primary-blue)'};
    color: white;
    border-radius: var(--radius-md);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    max-width: 400px;
    font-size: 0.9375rem;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Profile Form Submission
const profileForm = document.getElementById('settings-profile-form');
profileForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const email = document.getElementById('email').value.trim();
  
  if (!firstName || !lastName || !email) {
    showNotification('Please fill in all fields', 'error');
    return;
  }
  
  if (!isValidEmail(email)) {
    showNotification('Please enter a valid email address', 'error');
    return;
  }
  
  try {
    const result = await authFetch(`${apiBase}/users/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email }),
    });

    if (result?.data?.user) {
      syncUserState(result.data.user);
      cacheProfileData(result.data.user); // Update cache after successful save
      applyProfileToForm(result.data.user);

      if (!result.data.user.avatar) {
        updateAvatarPreview(null);
      }
    }

    showNotification('Profile updated successfully!', 'success');
  } catch (error) {
    console.error('Error updating profile:', error);
    showNotification(error.message || 'Failed to update profile', 'error');
  }
});

// Password Form Submission
const passwordForm = document.getElementById('settings-password-form');
passwordForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  if (!currentPassword || !newPassword || !confirmPassword) {
    showNotification('Please fill in all password fields', 'error');
    return;
  }
  
  if (newPassword.length < 8) {
    showNotification('New password must be at least 8 characters', 'error');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    showNotification('New passwords do not match', 'error');
    return;
  }
  
  try {
    await authFetch(`${apiBase}/users/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });

    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    showNotification('Password updated successfully!', 'success');
  } catch (error) {
    console.error('Error updating password:', error);
    showNotification(error.message || 'Failed to update password', 'error');
  }
});

// Password visibility toggles
document.querySelectorAll('.pw-toggle').forEach(button => {
  button.addEventListener('click', () => {
    const input = button.previousElementSibling;
    if (input.type === 'password') {
      input.type = 'text';
      button.classList.add('active');
    } else {
      input.type = 'password';
      button.classList.remove('active');
    }
  });
});

// Notification Preferences (listeners)
const notificationToggles = document.querySelectorAll('.notification-toggle');
notificationToggles.forEach(toggle => {
  toggle.addEventListener('change', (e) => {
    const label = e.target.dataset.label;
    const isEnabled = e.target.checked;
    
    // Save to localStorage
    const preferences = JSON.parse(localStorage.getItem('notificationPreferences') || '{}');
    preferences[label] = isEnabled;
    localStorage.setItem('notificationPreferences', JSON.stringify(preferences));
    
    showNotification(`${label} ${isEnabled ? 'enabled' : 'disabled'}`, 'success');
  });
});

// Preferences Form Submission
const preferencesForm = document.getElementById('settings-preferences-form');
preferencesForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const timezone = document.getElementById('timezone').value;
  const language = document.getElementById('language').value;
  
  try {
    // Save preferences
    const userPreferences = {
      timezone,
      language
    };
    
    localStorage.setItem('userPreferences', JSON.stringify(userPreferences));
    
    showNotification('Preferences saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving preferences:', error);
    showNotification('Failed to save preferences', 'error');
  }
});

// Add notification animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
