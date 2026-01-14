const mongoose = require('mongoose');

// Platform-wide Analytics Schema
// This collection stores aggregated statistics for the entire platform
const analyticsSchema = new mongoose.Schema(
  {
    // Platform metrics (aggregated across all users)
    totalUsersOnboarded: {
      type: Number,
      default: 0,
      min: [0, 'Cannot be negative'],
    },
    activeUsers: {
      type: Number,
      default: 0,
      min: [0, 'Cannot be negative'],
    },

    // Threat detection metrics
    totalPhishingUrlsDetected: {
      type: Number,
      default: 0,
      min: [0, 'Cannot be negative'],
    },
    totalUnsafeUrlsDetected: {
      type: Number,
      default: 0,
      min: [0, 'Cannot be negative'],
    },
    totalThreatUrlsDetected: {
      type: Number,
      default: 0,
      min: [0, 'Cannot be negative'],
    },
    totalSafeWebsitesVisited: {
      type: Number,
      default: 0,
      min: [0, 'Cannot be negative'],
    },

    // Protection metrics
    totalProtectionWarnings: {
      type: Number,
      default: 0,
      min: [0, 'Cannot be negative'],
    },
    totalUrlsChecked: {
      type: Number,
      default: 0,
      min: [0, 'Cannot be negative'],
    },

    // Computed metrics
    platformThreatDetectionRate: {
      type: Number,
      default: 0,
      min: [0, 'Cannot be negative'],
      max: [100, 'Cannot exceed 100'],
    },

    // Time-based aggregates
    dailyStats: [
      {
        date: {
          type: Date,
          required: true,
          index: true,
        },
        usersOnboardedToday: {
          type: Number,
          default: 0,
        },
        urlsCheckedToday: {
          type: Number,
          default: 0,
        },
        threatsDetectedToday: {
          type: Number,
          default: 0,
        },
        protectionWarningsToday: {
          type: Number,
          default: 0,
        },
        activeUsersToday: {
          type: Number,
          default: 0,
        },
        _id: false,
      },
    ],

    // Top threats for insights
    topPhishingDomains: [
      {
        domain: String,
        detectionCount: Number,
        lastDetected: Date,
        _id: false,
      },
    ],

    // Geographic data (if needed for expansion)
    usersByCountry: [
      {
        country: String,
        count: Number,
        _id: false,
      },
    ],

    // Performance metrics
    averageResponseTime: {
      type: Number,
      default: 0,
    },
    systemUptime: {
      type: Number,
      default: 100,
      min: [0, 'Cannot be negative'],
      max: [100, 'Cannot exceed 100'],
    },

    // Last updated info for real-time dashboards
    lastUpdated: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Metadata
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'analytics',
  }
);

// ======================== INDEXES ========================
analyticsSchema.index({ lastUpdated: -1 });
analyticsSchema.index({ 'dailyStats.date': -1 });

// ======================== METHODS ========================
// Update platform metrics efficiently
analyticsSchema.methods.updatePlatformMetrics = async function (
  userMetrics
) {
  const {
    newUsersCount = 0,
    activeUsersCount = 0,
    phishingUrls = 0,
    unsafeUrls = 0,
    threatUrls = 0,
    safeWebsites = 0,
    protectionWarnings = 0,
  } = userMetrics;

  // Increment totals
  this.totalUsersOnboarded += newUsersCount;
  this.activeUsers = activeUsersCount;
  this.totalPhishingUrlsDetected += phishingUrls;
  this.totalUnsafeUrlsDetected += unsafeUrls;
  this.totalThreatUrlsDetected += threatUrls;
  this.totalSafeWebsitesVisited += safeWebsites;
  this.totalProtectionWarnings += protectionWarnings;

  // Recalculate totals
  this.totalUrlsChecked =
    this.totalPhishingUrlsDetected +
    this.totalUnsafeUrlsDetected +
    this.totalThreatUrlsDetected +
    this.totalSafeWebsitesVisited;

  // Calculate threat detection rate
  const threatsDetected =
    this.totalPhishingUrlsDetected +
    this.totalUnsafeUrlsDetected +
    this.totalThreatUrlsDetected;
  this.platformThreatDetectionRate =
    this.totalUrlsChecked > 0
      ? parseFloat(
          ((threatsDetected / this.totalUrlsChecked) * 100).toFixed(2)
        )
      : 0;

  this.lastUpdated = new Date();
  return await this.save();
};

// Update daily statistics
analyticsSchema.methods.updateDailyStats = async function (dailyMetrics) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let dailyRecord = this.dailyStats.find(
    (stat) =>
      new Date(stat.date).getTime() === today.getTime()
  );

  if (!dailyRecord) {
    dailyRecord = {
      date: today,
      usersOnboardedToday: 0,
      urlsCheckedToday: 0,
      threatsDetectedToday: 0,
      protectionWarningsToday: 0,
      activeUsersToday: 0,
    };
    this.dailyStats.push(dailyRecord);
  }

  // Update daily metrics
  dailyRecord.usersOnboardedToday += dailyMetrics.newUsers || 0;
  dailyRecord.urlsCheckedToday += dailyMetrics.urlsChecked || 0;
  dailyRecord.threatsDetectedToday += dailyMetrics.threatsDetected || 0;
  dailyRecord.protectionWarningsToday += dailyMetrics.protectionWarnings || 0;
  dailyRecord.activeUsersToday = dailyMetrics.activeUsersCount || 0;

  // Keep only last 90 days of daily stats
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  this.dailyStats = this.dailyStats.filter(
    (stat) => new Date(stat.date) >= ninetyDaysAgo
  );

  this.lastUpdated = new Date();
  return await this.save();
};

// Track top phishing domains for insights
analyticsSchema.methods.updateTopPhishingDomains = async function (
  domain,
  maxDomains = 50
) {
  let domainRecord = this.topPhishingDomains.find((d) => d.domain === domain);

  if (!domainRecord) {
    domainRecord = {
      domain,
      detectionCount: 0,
      lastDetected: new Date(),
    };
    this.topPhishingDomains.push(domainRecord);
  }

  domainRecord.detectionCount += 1;
  domainRecord.lastDetected = new Date();

  // Sort and keep only top domains
  this.topPhishingDomains.sort((a, b) => b.detectionCount - a.detectionCount);
  this.topPhishingDomains = this.topPhishingDomains.slice(0, maxDomains);

  this.lastUpdated = new Date();
  return await this.save();
};

// Get dashboard summary for admin panel
analyticsSchema.methods.getDashboardSummary = function () {
  return {
    overview: {
      totalUsers: this.totalUsersOnboarded,
      activeUsers: this.activeUsers,
      totalUrlsChecked: this.totalUrlsChecked,
      totalProtectionWarnings: this.totalProtectionWarnings,
    },
    threats: {
      phishingUrls: this.totalPhishingUrlsDetected,
      unsafeUrls: this.totalUnsafeUrlsDetected,
      threatUrls: this.totalThreatUrlsDetected,
      totalThreatsDetected:
        this.totalPhishingUrlsDetected +
        this.totalUnsafeUrlsDetected +
        this.totalThreatUrlsDetected,
    },
    safeWebsites: this.totalSafeWebsitesVisited,
    platformThreatDetectionRate: this.platformThreatDetectionRate,
    topPhishingDomains: this.topPhishingDomains.slice(0, 10),
    lastUpdated: this.lastUpdated,
  };
};

// Get trending data for the last N days
analyticsSchema.methods.getTrendingData = function (days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const trendingData = this.dailyStats.filter(
    (stat) => new Date(stat.date) >= cutoffDate
  );

  return trendingData.map((stat) => ({
    date: stat.date.toISOString().split('T')[0],
    urlsChecked: stat.urlsCheckedToday,
    threatsDetected: stat.threatsDetectedToday,
    protectionWarnings: stat.protectionWarningsToday,
    activeUsers: stat.activeUsersToday,
    newUsers: stat.usersOnboardedToday,
  }));
};

// ======================== STATICS ========================
// Get or create the singleton analytics document
analyticsSchema.statics.getAnalytics = async function () {
  let analytics = await this.findOne({});
  if (!analytics) {
    analytics = await this.create({});
  }
  return analytics;
};

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics;
