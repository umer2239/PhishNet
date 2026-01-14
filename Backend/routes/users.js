const express = require('express');
const router = express.Router();
const User = require('../models/User');
const URLCheckHistory = require('../models/URLCheckHistory');
const { authMiddleware } = require('../middleware/auth');
const { isValidEmail, validatePassword } = require('../utils/validators');

// ======================== GET USER PROFILE ========================
router.get('/profile', authMiddleware, async (req, res, next) => {
  try {
    const user = req.user;

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: user.getProfile(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ======================== UPDATE USER PROFILE ========================
router.put('/profile', authMiddleware, async (req, res, next) => {
  try {
    const user = req.user;
    const { firstName, lastName, email } = req.body;

    // Only update provided fields
    if (firstName) {
      if (typeof firstName !== 'string' || firstName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'First name must be at least 2 characters',
        });
      }
      user.firstName = firstName.trim();
    }

    if (lastName) {
      if (typeof lastName !== 'string' || lastName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Last name must be at least 2 characters',
        });
      }
      user.lastName = lastName.trim();
    }

    if (email) {
      if (!isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format',
        });
      }

      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: user._id },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email already in use',
        });
      }

      user.email = email.toLowerCase().trim();
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.getProfile(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ======================== UPDATE PASSWORD ========================
router.put('/password', authMiddleware, async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Re-fetch with passwordHash included (select:false by default)
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All password fields are required',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match',
      });
    }

    // Verify current password
    const isCorrect = await user.comparePassword(currentPassword);
    if (!isCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'New password does not meet requirements',
        errors: passwordValidation.errors,
      });
    }

    // Check if new password is same as old password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password',
      });
    }

    // Update password
    user.passwordHash = newPassword;
    await user.save();

    // Clear all tokens (user must login again)
    user.jwtTokens = [];
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please login again.',
    });
  } catch (error) {
    next(error);
  }
});

// ======================== UPDATE PREFERENCES ========================
router.put('/preferences', authMiddleware, async (req, res, next) => {
  try {
    const user = req.user;
    const { emailNotifications, weeklyReportEmail, twoFactorEnabled } = req.body;

    if (emailNotifications !== undefined) {
      user.preferences.emailNotifications = Boolean(emailNotifications);
    }

    if (weeklyReportEmail !== undefined) {
      user.preferences.weeklyReportEmail = Boolean(weeklyReportEmail);
    }

    if (twoFactorEnabled !== undefined) {
      user.preferences.twoFactorEnabled = Boolean(twoFactorEnabled);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      data: {
        preferences: user.preferences,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ======================== GET CHECK HISTORY ========================
router.get('/history', authMiddleware, async (req, res, next) => {
  try {
    const user = req.user;
    const { page = 1, limit = 20, threatType, isSafe, sortBy = 'date' } = req.query;

    const skip = (page - 1) * limit;

    // Build filter
    const filters = {};
    if (threatType) {
      filters.threatType = threatType;
    }
    if (isSafe !== undefined) {
      filters.isSafe = isSafe === 'true';
    }

    // Get check history
    const history = await URLCheckHistory.getUserHistory(user._id, filters, parseInt(limit), skip);

    // Get total count
    const total = await URLCheckHistory.countDocuments({
      userId: user._id,
      ...filters,
    });

    res.status(200).json({
      success: true,
      message: 'Check history retrieved successfully',
      data: {
        history,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ======================== GET THREAT STATISTICS ========================
router.get('/stats', authMiddleware, async (req, res, next) => {
  try {
    const user = req.user;

    const stats = await URLCheckHistory.getUserThreatStats(user._id);

    res.status(200).json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: {
        stats: stats.length > 0 ? stats[0] : {
          totalChecks: 0,
          safeUrls: 0,
          unsafeUrls: 0,
          phishingDetected: 0,
          malwareDetected: 0,
          warningsTriggered: 0,
        },
        userMetrics: {
          safeWebsitesVisited: user.safeWebsitesVisited,
          unsafeUrlsDetected: user.unsafeUrlsDetected,
          phishingUrlsDetected: user.phishingUrlsDetected,
          threatUrlsDetected: user.threatUrlsDetected,
          totalProtectionWarnings: user.totalProtectionWarnings,
          totalUrlsChecked: user.totalUrlsChecked,
          protectionRatio: user.protectionRatio,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ======================== DELETE ACCOUNT ========================
router.delete('/account', authMiddleware, async (req, res, next) => {
  try {
    const user = req.user;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to delete account',
      });
    }

    // Verify password
    const isCorrect = await user.comparePassword(password);
    if (!isCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Password is incorrect',
      });
    }

    // Delete user's check history
    await URLCheckHistory.deleteMany({ userId: user._id });

    // Delete user account
    await User.findByIdAndDelete(user._id);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// ======================== GET RECENT ACTIVITY ========================
router.get('/activity', authMiddleware, async (req, res, next) => {
  try {
    const user = req.user;
    const { days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const activity = await URLCheckHistory.find({
      userId: user._id,
      checkedAt: { $gte: startDate },
    })
      .sort({ checkedAt: -1 })
      .limit(50)
      .select('url domain isSafe threatType checkedAt userWarned userAction');

    res.status(200).json({
      success: true,
      message: 'Recent activity retrieved successfully',
      data: {
        days: parseInt(days),
        activity,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
