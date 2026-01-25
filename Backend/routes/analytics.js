const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');
const User = require('../models/User');
const URLCheckHistory = require('../models/URLCheckHistory');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// ======================== GET DASHBOARD SUMMARY ========================
router.get('/dashboard', authMiddleware, async (req, res, next) => {
  try {
    const analytics = await Analytics.getAnalytics();
    const user = req.user;

    const dashboardData = {
      platformMetrics: analytics.getDashboardSummary(),
      userMetrics: {
        safeWebsitesVisited: user.safeWebsitesVisited,
        unsafeUrlsDetected: user.unsafeUrlsDetected,
        phishingUrlsDetected: user.phishingUrlsDetected,
        threatUrlsDetected: user.threatUrlsDetected,
        totalProtectionWarnings: user.totalProtectionWarnings,
        totalUrlsChecked: user.totalUrlsChecked,
        protectionRatio: user.protectionRatio,
      },
      userStats: {
        lastLogin: user.lastLogin,
        accountCreated: user.createdAt,
        email: user.email,
      },
    };

    res.status(200).json({
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: dashboardData,
    });
  } catch (error) {
    next(error);
  }
});

// ======================== GET TRENDING DATA ========================
router.get('/trends', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { days = 30 } = req.query;

    const analytics = await Analytics.getAnalytics();
    const trendingData = analytics.getTrendingData(parseInt(days));

    res.status(200).json({
      success: true,
      message: 'Trending data retrieved successfully',
      data: {
        days: parseInt(days),
        trends: trendingData,
        summary: {
          totalUrlsChecked: trendingData.reduce((sum, day) => sum + day.urlsChecked, 0),
          totalThreatsDetected: trendingData.reduce((sum, day) => sum + day.threatsDetected, 0),
          averageUrlsPerDay: Math.ceil(
            trendingData.reduce((sum, day) => sum + day.urlsChecked, 0) / trendingData.length
          ),
          averageThreatsPerDay: Math.ceil(
            trendingData.reduce((sum, day) => sum + day.threatsDetected, 0) / trendingData.length
          ),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ======================== GET PLATFORM SUMMARY ========================
router.get('/summary', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const analytics = await Analytics.getAnalytics();

    res.status(200).json({
      success: true,
      message: 'Platform summary retrieved successfully',
      data: analytics.getDashboardSummary(),
    });
  } catch (error) {
    next(error);
  }
});

// ======================== GET TOP PHISHING DOMAINS ========================
router.get('/top-domains', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const topDomains = await URLCheckHistory.getMostDangerousDomains(parseInt(limit), 30);

    res.status(200).json({
      success: true,
      message: 'Top phishing domains retrieved successfully',
      data: {
        topDomains,
        totalDomains: topDomains.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ======================== GET DANGEROUS URLS TODAY ========================
router.get('/dangerous-today', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const dangerousUrls = await URLCheckHistory.getDangerousUrlsToday();

    res.status(200).json({
      success: true,
      message: 'Dangerous URLs detected today retrieved successfully',
      data: {
        count: dangerousUrls.length,
        urls: dangerousUrls,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ======================== GET USER RANKING ========================
router.get('/rankings', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { type = 'urls_checked', limit = 10 } = req.query;

    let sortField = 'totalUrlsChecked';
    let label = 'Most URLs Checked';

    if (type === 'threats_detected') {
      sortField = 'unsafeUrlsDetected';
      label = 'Most Threats Detected';
    } else if (type === 'protection') {
      sortField = 'totalProtectionWarnings';
      label = 'Most Protected';
    }

    const rankings = await User.find({ isActive: true })
      .select(
        'firstName lastName email ' + sortField + ' createdAt'
      )
      .sort({ [sortField]: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'User rankings retrieved successfully',
      data: {
        type,
        label,
        rankings: rankings.map((user, index) => ({
          rank: index + 1,
          name: user.firstName + ' ' + user.lastName,
          email: user.email,
          value: user[sortField],
          joinedAt: user.createdAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ======================== GET THREAT DISTRIBUTION ========================
router.get('/threat-distribution', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const distribution = await URLCheckHistory.aggregate([
      {
        $group: {
          _id: '$threatType',
          count: { $sum: 1 },
          percentage: { $avg: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const total = distribution.reduce((sum, item) => sum + item.count, 0);

    const formattedDistribution = distribution.map((item) => ({
      threatType: item._id,
      count: item.count,
      percentage: total > 0 ? parseFloat(((item.count / total) * 100).toFixed(2)) : 0,
    }));

    res.status(200).json({
      success: true,
      message: 'Threat distribution retrieved successfully',
      data: {
        distribution: formattedDistribution,
        totalThreats: total,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ======================== GET RECENT ACTIVITY (PLATFORM) ========================
router.get('/recent-activity', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;

    const recentActivity = await URLCheckHistory.find({ isSafe: false })
      .sort({ checkedAt: -1 })
      .limit(parseInt(limit))
      .select('domain threatType threatLevel checkedAt userWarned')
      .populate('userId', 'firstName lastName email');

    res.status(200).json({
      success: true,
      message: 'Recent platform activity retrieved successfully',
      data: {
        activity: recentActivity,
        count: recentActivity.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ======================== GET ANALYTICS OVERVIEW ========================
router.get('/overview', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const analytics = await Analytics.getAnalytics();

    // Get daily stats for last 7 days
    const last7Days = analytics.getTrendingData(7);

    // Get comparison with previous 7 days
    const dailyStats = analytics.dailyStats;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const last7DaysStats = dailyStats.filter((stat) => {
      const statDate = new Date(stat.date);
      const daysDiff = Math.floor((today - statDate) / (1000 * 60 * 60 * 24));
      return daysDiff >= 0 && daysDiff < 7;
    });

    const previous7DaysStats = dailyStats.filter((stat) => {
      const statDate = new Date(stat.date);
      const daysDiff = Math.floor((today - statDate) / (1000 * 60 * 60 * 24));
      return daysDiff >= 7 && daysDiff < 14;
    });

    const last7DaysTotal = last7DaysStats.reduce((sum, stat) => sum + stat.urlsCheckedToday, 0);
    const previous7DaysTotal = previous7DaysStats.reduce(
      (sum, stat) => sum + stat.urlsCheckedToday,
      0
    );

    const percentageChange =
      previous7DaysTotal > 0
        ? parseFloat((((last7DaysTotal - previous7DaysTotal) / previous7DaysTotal) * 100).toFixed(2))
        : 0;

    res.status(200).json({
      success: true,
      message: 'Analytics overview retrieved successfully',
      data: {
        overview: {
          totalUsers: analytics.totalUsersOnboarded,
          activeUsers: analytics.activeUsers,
          totalUrlsChecked: analytics.totalUrlsChecked,
          totalThreatsDetected:
            analytics.totalPhishingUrlsDetected +
            analytics.totalUnsafeUrlsDetected +
            analytics.totalThreatUrlsDetected,
          totalProtectionWarnings: analytics.totalProtectionWarnings,
          platformThreatDetectionRate: analytics.platformThreatDetectionRate,
        },
        last7Days: {
          totalChecks: last7DaysTotal,
          avgPerDay: Math.ceil(last7DaysTotal / 7),
          percentageChange: percentageChange,
        },
        topDomains: analytics.topPhishingDomains.slice(0, 5),
        lastUpdated: analytics.lastUpdated,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ======================== GET PLATFORM STATS (PUBLIC) ========================
router.get('/platform-stats', async (req, res, next) => {
  try {
    const analytics = await Analytics.getAnalytics();

    res.status(200).json({
      success: true,
      message: 'Platform statistics retrieved successfully',
      data: {
        totalUsersOnboarded: analytics.totalUsersOnboarded,
        activeUsers: analytics.activeUsers,
        totalUrlsChecked: analytics.totalUrlsChecked,
        totalPhishingUrlsDetected: analytics.totalPhishingUrlsDetected,
        totalUnsafeUrlsDetected: analytics.totalUnsafeUrlsDetected,
        totalThreatUrlsDetected: analytics.totalThreatUrlsDetected,
        totalSafeWebsitesVisited: analytics.totalSafeWebsitesVisited,
        totalProtectionWarnings: analytics.totalProtectionWarnings,
        platformThreatDetectionRate: analytics.platformThreatDetectionRate,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
