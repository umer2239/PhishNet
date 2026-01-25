const express = require('express');
const router = express.Router();
const URLCheckHistory = require('../models/URLCheckHistory');

// GET /api/dashboard/security-tips
router.get('/security-tips', async (req, res, next) => {
  try {
    const user = req.user; // authMiddleware is applied in server.js when mounting
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Gather simple stats (read-only)
    const statsAgg = await URLCheckHistory.getUserThreatStats(user._id);
    const stats = (Array.isArray(statsAgg) && statsAgg.length > 0) ? statsAgg[0] : null;

    const totalChecks = stats ? stats.totalChecks || 0 : 0;
    const safeUrls = stats ? stats.safeUrls || 0 : 0;
    const unsafeUrls = stats ? stats.unsafeUrls || 0 : 0;
    const phishingDetected = stats ? stats.phishingDetected || 0 : 0;
    const malwareDetected = stats ? stats.malwareDetected || 0 : 0;
    const warningsTriggered = stats ? stats.warningsTriggered || 0 : 0;

    // Check for email scans existence
    const emailCount = await URLCheckHistory.countDocuments({ userId: user._id, scanType: 'email' }).limit(1).exec().catch(()=>0);

    const tips = [];

    // 1) High priority: confirmed malicious/phishing/malware
    if ((phishingDetected + malwareDetected) > 0) {
      tips.push({ type: 'warning', message: 'One or more recent scans detected confirmed malicious or phishing content — review those reports immediately.' });
    }

    // 2) Suspicious items
    if (unsafeUrls > 0 && tips.length < 3) {
      tips.push({ type: 'info', message: 'Some of your recent scans showed suspicious indicators. Avoid visiting unfamiliar links and verify the domain before entering credentials.' });
    }

    // 3) Phishing awareness when email scans exist
    if (emailCount > 0 && tips.length < 3) {
      tips.push({ type: 'info', message: 'Be cautious with emails containing links or urgent requests — avoid clicking links from unknown senders.' });
    }

    // 4) Account security: 2FA
    try {
      const twoFaEnabled = (user.preferences && !!user.preferences.twoFactorEnabled) === true;
      if (!twoFaEnabled && tips.length < 3) {
        tips.push({ type: 'success', message: 'Enable Two-Factor Authentication (2FA) to improve your account security.' });
      }
    } catch (e) {}

    // 5) If no issues detected recently, show a positive success tip (only if no other tips)
    if (tips.length === 0) {
      if (totalChecks > 0 && safeUrls === totalChecks) {
        tips.push({ type: 'success', message: 'All recent scans look safe — continue following best practices to stay protected.' });
      } else if (totalChecks === 0) {
        tips.push({ type: 'info', message: 'No scan history available — perform a scan on the homepage to get personalized recommendations.' });
      }
    }

    // Ensure deterministic ordering and max 3 tips
    res.status(200).json({ success: true, tips: tips.slice(0, 3) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
