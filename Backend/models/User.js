const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// User Schema for phishing protection website
const userSchema = new mongoose.Schema(
  {
    // Basic user information
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters'],
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters'],
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
      index: true, // For faster email lookups
    },

    // Password (stored as hash)
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Exclude from queries by default for security
    },

    // JWT token fields
    jwtTokens: [
      {
        token: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
          expires: 7 * 24 * 60 * 60, // Auto-delete after 7 days
        },
      },
    ],

    // Account status
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      select: false,
    },
    verificationTokenExpiry: {
      type: Date,
      select: false,
    },

    // Password reset
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpiry: {
      type: Date,
      select: false,
    },

    // Account activity tracking
    lastLogin: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // User safety metrics (per user analytics)
    safeWebsitesVisited: {
      type: Number,
      default: 0,
      min: [0, 'Cannot be negative'],
    },
    unsafeUrlsDetected: {
      type: Number,
      default: 0,
      min: [0, 'Cannot be negative'],
    },
    phishingUrlsDetected: {
      type: Number,
      default: 0,
      min: [0, 'Cannot be negative'],
    },
    threatUrlsDetected: {
      type: Number,
      default: 0,
      min: [0, 'Cannot be negative'],
    },
    totalProtectionWarnings: {
      type: Number,
      default: 0,
      min: [0, 'Cannot be negative'],
    },

    // Computed fields for analytics (denormalized for performance)
    totalUrlsChecked: {
      type: Number,
      default: 0,
      index: true,
    },
    protectionRatio: {
      type: Number,
      default: 0,
      min: [0, 'Cannot be negative'],
    },

    // User preferences
    preferences: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      weeklyReportEmail: {
        type: Boolean,
        default: true,
      },
      twoFactorEnabled: {
        type: Boolean,
        default: false,
      },
    },

    // Audit trail
    ipAddresses: [
      {
        ip: String,
        lastSeen: Date,
        _id: false,
      },
    ],
    loginAttempts: {
      type: Number,
      default: 0,
    },
    accountLockedUntil: {
      type: Date,
      default: null,
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Automatically updates updatedAt
    collection: 'users',
  }
);

// ======================== INDEXES ========================
// Compound indexes for common queries
userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ totalUrlsChecked: -1 }); // For leaderboards/analytics

// ======================== MIDDLEWARE ========================
// Hash password before saving (only if modified)
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update updatedAt timestamp before save
userSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// ======================== METHODS ========================
// Compare passwords during login
userSchema.methods.comparePassword = async function (plainPassword) {
  return await bcrypt.compare(plainPassword, this.passwordHash);
};

// Generate JWT token
userSchema.methods.generateJWTToken = function (secret, expiresIn = '7d') {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ userId: this._id, email: this.email }, secret, {
    expiresIn,
  });
};

// Add JWT token to jwtTokens array
userSchema.methods.addJWTToken = async function (token) {
  this.jwtTokens.push({
    token,
    createdAt: new Date(),
  });
  return await this.save();
};

// Verify JWT token exists in user's tokens
userSchema.methods.verifyJWTToken = function (token) {
  return this.jwtTokens.some((t) => t.token === token);
};

// Remove expired tokens
userSchema.methods.removeExpiredTokens = async function () {
  const now = new Date();
  this.jwtTokens = this.jwtTokens.filter(
    (t) => new Date(t.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000 > now.getTime()
  );
  return await this.save();
};

// Update user metrics safely
userSchema.methods.updateMetrics = async function (metrics) {
  const {
    safeWebsites = 0,
    unsafeUrls = 0,
    phishingUrls = 0,
    threatUrls = 0,
    protectionWarnings = 0,
  } = metrics;

  this.safeWebsitesVisited += safeWebsites;
  this.unsafeUrlsDetected += unsafeUrls;
  this.phishingUrlsDetected += phishingUrls;
  this.threatUrlsDetected += threatUrls;
  this.totalProtectionWarnings += protectionWarnings;

  // Recalculate totals
  this.totalUrlsChecked =
    this.unsafeUrlsDetected +
    this.phishingUrlsDetected +
    this.threatUrlsDetected +
    this.safeWebsitesVisited;

  // Calculate protection ratio (percentage of threats detected)
  const threatsDetected =
    this.unsafeUrlsDetected +
    this.phishingUrlsDetected +
    this.threatUrlsDetected;
  this.protectionRatio =
    this.totalUrlsChecked > 0
      ? parseFloat(((threatsDetected / this.totalUrlsChecked) * 100).toFixed(2))
      : 0;

  return await this.save();
};

// Lock account for failed login attempts
userSchema.methods.lockAccount = async function (minutes = 30) {
  this.accountLockedUntil = new Date(Date.now() + minutes * 60 * 1000);
  return await this.save();
};

// Unlock account
userSchema.methods.unlockAccount = async function () {
  this.accountLockedUntil = null;
  this.loginAttempts = 0;
  return await this.save();
};

// Get user profile (safe data without sensitive fields)
userSchema.methods.getProfile = function () {
  return {
    id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    isVerified: this.isVerified,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    safeWebsitesVisited: this.safeWebsitesVisited,
    unsafeUrlsDetected: this.unsafeUrlsDetected,
    phishingUrlsDetected: this.phishingUrlsDetected,
    threatUrlsDetected: this.threatUrlsDetected,
    totalProtectionWarnings: this.totalProtectionWarnings,
    totalUrlsChecked: this.totalUrlsChecked,
    protectionRatio: this.protectionRatio,
    preferences: this.preferences,
  };
};

// ======================== STATICS ========================
// Find user by email (for login)
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() }).select('+passwordHash');
};

// Check if account is locked
userSchema.methods.isAccountLocked = function () {
  return this.accountLockedUntil && this.accountLockedUntil > new Date();
};

const User = mongoose.model('User', userSchema);

module.exports = User;
