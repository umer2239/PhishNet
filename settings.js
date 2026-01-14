// Settings Page Functionality

// Avatar Upload and Preview
const avatarFile = document.getElementById('avatarFile');
const avatarUploadBtn = document.getElementById('avatarUploadBtn');
const avatarRemoveBtn = document.getElementById('avatarRemoveBtn');
const settingsAvatarPreview = document.getElementById('settingsAvatarPreview');
const avatarFitMode = document.getElementById('avatarFitMode');

let currentAvatarURL = null;

// Trigger file input when upload button clicked
avatarUploadBtn?.addEventListener('click', () => {
  avatarFile.click();
});

// Handle avatar file selection
avatarFile?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      showNotification('Image size must be less than 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      currentAvatarURL = event.target.result;
      updateAvatarPreview(currentAvatarURL);
      
      // Save to localStorage
      localStorage.setItem('userAvatar', currentAvatarURL);
      localStorage.setItem('avatarFitMode', avatarFitMode.value);
      // Also persist inside user object across known keys
      try {
        const keys = ['pishnet_user', 'phishnet_currentUser', 'currentUser'];
        keys.forEach(key => {
          const raw = localStorage.getItem(key);
          if (raw) {
            const obj = JSON.parse(raw);
            obj.avatar = currentAvatarURL;
            obj.avatarFit = avatarFitMode.value;
            localStorage.setItem(key, JSON.stringify(obj));
          }
        });
      } catch {}
      
      // Update header avatar immediately
      updateHeaderAvatar(currentAvatarURL, avatarFitMode.value);
      
      showNotification('Profile picture uploaded successfully!', 'success');
    };
    reader.readAsDataURL(file);
  }
});

// Update avatar preview
function updateAvatarPreview(imageURL) {
  if (imageURL) {
    settingsAvatarPreview.style.backgroundImage = `url(${imageURL})`;
    settingsAvatarPreview.style.backgroundSize = avatarFitMode.value;
    settingsAvatarPreview.style.backgroundPosition = 'center';
    settingsAvatarPreview.style.backgroundRepeat = 'no-repeat';
    settingsAvatarPreview.textContent = '';
  } else {
    // Reset to initials from stored user data
    const user = JSON.parse(localStorage.getItem('pishnet_user') || 
                           localStorage.getItem('phishnet_currentUser') || 
                           localStorage.getItem('currentUser') || '{}');
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
    headerAvatar.style.backgroundSize = fitMode || 'cover';
    headerAvatar.style.backgroundPosition = 'center';
    headerAvatar.style.backgroundRepeat = 'no-repeat';
    headerAvatar.textContent = '';
  } else {
    // Reset to initials
    const user = JSON.parse(localStorage.getItem('pishnet_user') || 
                           localStorage.getItem('phishnet_currentUser') || 
                           localStorage.getItem('currentUser') || '{}');
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

// Avatar fit mode change
avatarFitMode?.addEventListener('change', () => {
  if (currentAvatarURL) {
    updateAvatarPreview(currentAvatarURL);
    localStorage.setItem('avatarFitMode', avatarFitMode.value);
    // Update header avatar immediately
    updateHeaderAvatar(currentAvatarURL, avatarFitMode.value);
  }
});

// Remove avatar
avatarRemoveBtn?.addEventListener('click', () => {
  currentAvatarURL = null;
  localStorage.removeItem('userAvatar');
  localStorage.removeItem('avatarFitMode');
  updateAvatarPreview(null);
  avatarFile.value = '';
  
  // Remove avatar from user object across known keys
  try {
    const keys = ['pishnet_user', 'phishnet_currentUser', 'currentUser'];
    keys.forEach(key => {
      const raw = localStorage.getItem(key);
      if (raw) {
        const obj = JSON.parse(raw);
        delete obj.avatar;
        delete obj.avatarFit;
        localStorage.setItem(key, JSON.stringify(obj));
      }
    });
  } catch {}
  
  // Update header avatar to show initials
  updateHeaderAvatar(null, null);
  
  showNotification('Profile picture removed', 'success');
});

// Load saved avatar on page load
window.addEventListener('DOMContentLoaded', () => {
  const savedAvatar = localStorage.getItem('userAvatar');
  const savedFitMode = localStorage.getItem('avatarFitMode');
  
  // Fallback: read avatar from stored user object if localStorage missing
  if (!savedAvatar) {
    try {
      const user = JSON.parse(localStorage.getItem('pishnet_user') || 
                              localStorage.getItem('phishnet_currentUser') || 
                              localStorage.getItem('currentUser') || '{}');
      if (user && user.avatar) {
        currentAvatarURL = user.avatar;
        updateAvatarPreview(currentAvatarURL);
        if (user.avatarFit) avatarFitMode.value = user.avatarFit;
      }
    } catch {}
  }
  
  if (savedAvatar) {
    currentAvatarURL = savedAvatar;
    if (savedFitMode) {
      avatarFitMode.value = savedFitMode;
    }
    updateAvatarPreview(savedAvatar);
  }
  
  // Load user profile data
  loadProfileData();
  loadNotificationPreferences();
  loadUserPreferences();
});

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
    // Save to localStorage (in production, this would be an API call)
    const currentUser = JSON.parse(localStorage.getItem('pishnet_user') || 
                                   localStorage.getItem('phishnet_currentUser') || 
                                   localStorage.getItem('currentUser') || '{}');
    currentUser.firstName = firstName;
    currentUser.lastName = lastName;
    currentUser.name = `${firstName} ${lastName}`;
    currentUser.email = email;
    
    // Save to all possible keys to ensure compatibility
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    localStorage.setItem('pishnet_user', JSON.stringify(currentUser));
    localStorage.setItem('phishnet_currentUser', JSON.stringify(currentUser));
    
    // Update avatar initials if no picture
    if (!currentAvatarURL) {
      updateAvatarPreview(null);
    }
    
    showNotification('Profile updated successfully!', 'success');
  } catch (error) {
    console.error('Error updating profile:', error);
    showNotification('Failed to update profile', 'error');
  }
});

// Load profile data
function loadProfileData() {
  // Try both storage keys
  let user = JSON.parse(localStorage.getItem('pishnet_user') || 
                        localStorage.getItem('phishnet_currentUser') || 
                        localStorage.getItem('currentUser') || '{}');
  
  // Set fields with existing user data
  if (user.firstName) document.getElementById('firstName').value = user.firstName;
  if (user.lastName) document.getElementById('lastName').value = user.lastName;
  if (user.email) {
    document.getElementById('email').value = user.email;
    // Make email field read-only if it came from signup/login
    document.getElementById('email').setAttribute('readonly', 'readonly');
    document.getElementById('email').style.opacity = '0.7';
    document.getElementById('email').style.cursor = 'not-allowed';
  }
}

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
    // In production, this would validate current password and update via API
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    // Simulate password check (in real app, check against stored hash)
    if (user.password && currentPassword !== user.password) {
      showNotification('Current password is incorrect', 'error');
      return;
    }
    
    // Update password
    user.password = newPassword;
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    // Clear form
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    
    showNotification('Password updated successfully!', 'success');
  } catch (error) {
    console.error('Error updating password:', error);
    showNotification('Failed to update password', 'error');
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

// Notification Preferences
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

// Load notification preferences
function loadNotificationPreferences() {
  const preferences = JSON.parse(localStorage.getItem('notificationPreferences') || '{}');
  
  notificationToggles.forEach(toggle => {
    const label = toggle.dataset.label;
    if (preferences.hasOwnProperty(label)) {
      toggle.checked = preferences[label];
    }
  });
}

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

// Load user preferences
function loadUserPreferences() {
  const preferences = JSON.parse(localStorage.getItem('userPreferences') || '{}');
  
  if (preferences.timezone) {
    document.getElementById('timezone').value = preferences.timezone;
  }
  if (preferences.language) {
    document.getElementById('language').value = preferences.language;
  }
}

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
