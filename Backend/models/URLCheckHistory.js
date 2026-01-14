const mongoose = require('mongoose');

// URL Check History Schema
// Tracks individual URL checks for audit trail and analytics
const urlCheckHistorySchema = new mongoose.Schema(
  {
    // Reference to user who checked the URL
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // URL details
    url: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    domain: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
    },

    // Threat assessment
    isSafe: {
      type: Boolean,
      default: true,
    },
    threatType: {
      type: String,
      enum: ['safe', 'phishing', 'malware', 'unsafe', 'suspicious', 'unknown'],
      default: 'unknown',
      index: true,
    },
    threatLevel: {
      type: String,
      enum: ['safe', 'low', 'medium', 'high', 'critical'],
      default: 'safe',
    },

    // Threat details
    threatCategories: [String], // e.g., ['phishing', 'credential harvesting']
    threatsDetected: [
      {
        name: String,
        severity: String,
        description: String,
        _id: false,
      },
    ],

    // Detection metadata
    detectionSource: {
      type: String,
      enum: ['database', 'api', 'machine_learning', 'user_report'],
      default: 'database',
    },
    confidence: {
      type: Number,
      default: 100,
      min: [0, 'Cannot be negative'],
      max: [100, 'Cannot exceed 100'],
    },

    // Whether user was warned
    userWarned: {
      type: Boolean,
      default: false,
    },
    warningType: {
      type: String,
      enum: ['none', 'banner', 'modal', 'block'],
      default: 'none',
    },

    // User action after warning
    userAction: {
      type: String,
      enum: ['proceeded', 'blocked', 'reported', 'whitelisted', 'pending'],
      default: 'pending',
    },

    // Timestamps
    checkedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
      // TTL Index: Auto-delete records older than 1 year for data retention
      expires: 365 * 24 * 60 * 60,
    },
  },
  {
    collection: 'urlCheckHistory',
  }
);

// ======================== INDEXES ========================
urlCheckHistorySchema.index({ userId: 1, checkedAt: -1 });
urlCheckHistorySchema.index({ domain: 1, threatType: 1 });
urlCheckHistorySchema.index({ checkedAt: -1 });
urlCheckHistorySchema.index({ isSafe: 1, checkedAt: -1 });
urlCheckHistorySchema.index({ threatType: 1, checkedAt: -1 });

// ======================== METHODS ========================
// Get user's check history with filters
urlCheckHistorySchema.statics.getUserHistory = function (
  userId,
  filters = {},
  limit = 50,
  skip = 0
) {
  let query = this.find({ userId });

  // Apply filters
  if (filters.threatType) {
    query = query.where('threatType').equals(filters.threatType);
  }
  if (filters.isSafe !== undefined) {
    query = query.where('isSafe').equals(filters.isSafe);
  }
  if (filters.userWarned !== undefined) {
    query = query.where('userWarned').equals(filters.userWarned);
  }

  // Date range filter
  if (filters.startDate || filters.endDate) {
    const dateQuery = {};
    if (filters.startDate) dateQuery.$gte = new Date(filters.startDate);
    if (filters.endDate) dateQuery.$lte = new Date(filters.endDate);
    query = query.where('checkedAt').gte(dateQuery.$gte || null);
  }

  return query
    .sort({ checkedAt: -1 })
    .limit(limit)
    .skip(skip)
    .exec();
};

// Get dangerous URLs detected today
urlCheckHistorySchema.statics.getDangerousUrlsToday = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return this.find({
    isSafe: false,
    checkedAt: { $gte: today },
  })
    .sort({ checkedAt: -1 })
    .limit(100);
};

// Get most frequently checked dangerous domains
urlCheckHistorySchema.statics.getMostDangerousDomains = function (
  limit = 10,
  days = 30
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        isSafe: false,
        checkedAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$domain',
        detectionCount: { $sum: 1 },
        threatTypes: { $push: '$threatType' },
        lastDetected: { $max: '$checkedAt' },
      },
    },
    {
      $sort: { detectionCount: -1 },
    },
    {
      $limit: limit,
    },
  ]);
};

// Get user's threat statistics
urlCheckHistorySchema.statics.getUserThreatStats = function (userId) {
  return this.aggregate([
    {
      $match: { userId: new mongoose.Types.ObjectId(userId) },
    },
    {
      $group: {
        _id: null,
        totalChecks: { $sum: 1 },
        safeUrls: {
          $sum: {
            $cond: ['$isSafe', 1, 0],
          },
        },
        unsafeUrls: {
          $sum: {
            $cond: ['$isSafe', 0, 1],
          },
        },
        phishingDetected: {
          $sum: {
            $cond: [{ $eq: ['$threatType', 'phishing'] }, 1, 0],
          },
        },
        malwareDetected: {
          $sum: {
            $cond: [{ $eq: ['$threatType', 'malware'] }, 1, 0],
          },
        },
        warningsTriggered: {
          $sum: {
            $cond: ['$userWarned', 1, 0],
          },
        },
      },
    },
  ]);
};

const URLCheckHistory = mongoose.model(
  'URLCheckHistory',
  urlCheckHistorySchema
);

module.exports = URLCheckHistory;
