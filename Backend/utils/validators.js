// Email validation regex
const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

// Validate email format
const isValidEmail = (email) => {
  return emailRegex.test(email);
};

// Validate password strength
const validatePassword = (password) => {
  const errors = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Extract domain from URL
const extractDomain = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase();
  } catch {
    // If not a valid URL, try to extract domain manually
    const domain = url
      .toLowerCase()
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .split('/')[0];
    return domain;
  }
};

// Check if URL is valid
const isValidURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Sanitize URL
const sanitizeURL = (url) => {
  return url.toLowerCase().trim();
};

// Simple phishing detection heuristics (basic implementation)
// In production, use specialized APIs like Google Safe Browsing API
const checkURLSafety = (url) => {
  const domain = extractDomain(url);
  const lowerUrl = url.toLowerCase();

  // Known phishing indicators
  const phishingIndicators = [
    'verify', 'confirm', 'urgent', 'update', 'alert', 'suspended',
    'restricted', 'unusual', 'activity', 'click', 'act', 'now',
    'limited', 'access', 'security', 'login', 'account'
  ];

  // Check for suspicious patterns
  let suspicionScore = 0;

  // Check for IP addresses instead of domain names
  if (/^\d+\.\d+\.\d+\.\d+/.test(domain)) {
    suspicionScore += 20;
  }

  // Check for excessive subdomains
  if ((domain.match(/\./g) || []).length > 3) {
    suspicionScore += 15;
  }

  // Check for suspicious keywords
  phishingIndicators.forEach((indicator) => {
    if (lowerUrl.includes(indicator)) {
      suspicionScore += 5;
    }
  });

  // Check for uncommon TLDs
  const commonTLDs = ['.com', '.org', '.net', '.edu', '.gov', '.co.uk', '.de', '.fr'];
  if (!commonTLDs.some((tld) => domain.endsWith(tld))) {
    suspicionScore += 10;
  }

  return {
    isSafe: suspicionScore < 30,
    threatLevel: suspicionScore < 10 ? 'safe' : suspicionScore < 30 ? 'low' : suspicionScore < 60 ? 'medium' : suspicionScore < 80 ? 'high' : 'critical',
    suspicionScore: Math.min(suspicionScore, 100),
    threatType: suspicionScore > 0 ? 'suspicious' : 'safe',
  };
};

module.exports = {
  isValidEmail,
  validatePassword,
  extractDomain,
  isValidURL,
  sanitizeURL,
  checkURLSafety,
};
