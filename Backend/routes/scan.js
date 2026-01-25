const express = require('express');
const router = express.Router();
const URLCheckHistory = require('../models/URLCheckHistory');
const Analytics = require('../models/Analytics');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { isValidURL, sanitizeURL, checkURLSafety, extractDomain } = require('../utils/validators');

// ======================== CHECK URL SAFETY ========================
router.post('/url', optionalAuthMiddleware, async (req, res, next) => {
  try {
    const { url } = req.body;

    // Validation
    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'URL is required and must be a string',
      });
    }

    // Sanitize and validate URL
    const sanitizedURL = sanitizeURL(url);

    if (!isValidURL(sanitizedURL)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL format. Please provide a valid URL (e.g., https://example.com)',
      });
    }

    const domain = extractDomain(sanitizedURL);

    // Check URL safety (server-side) but allow client-provided analysis to override when present
    const safetyCheck = checkURLSafety(sanitizedURL);

    // Accept optional analysis overrides from client
    const {
      isSafe: clientIsSafe,
      threatLevel: clientThreatLevel,
      threatType: clientThreatType,
      confidence: clientConfidence,
      indicators: clientIndicators,
      issues: clientIssues,
      summary: clientSummary,
      scanType: clientScanType
    } = req.body || {};

    // Prepare threat data - prefer client-supplied analysis when provided
    const threatData = {
      userId: req.user ? req.user._id : null,
      url: sanitizedURL,
      domain: domain,
      isSafe: typeof clientIsSafe !== 'undefined' ? clientIsSafe : safetyCheck.isSafe,
      threatType: clientThreatType || safetyCheck.threatType,
      threatLevel: clientThreatLevel || safetyCheck.threatLevel,
      detectionSource: 'database',
      confidence: typeof clientConfidence !== 'undefined' ? clientConfidence : (safetyCheck.isSafe ? 100 : Math.max(50, 100 - (safetyCheck.suspicionScore || 50))),
      userWarned: typeof clientIsSafe !== 'undefined' ? !clientIsSafe : !safetyCheck.isSafe,
      warningType: (typeof clientIsSafe !== 'undefined' ? (!clientIsSafe ? 'banner' : 'none') : (safetyCheck.isSafe ? 'none' : 'banner')),
      userAction: 'pending',
      indicators: clientIndicators || [],
      issues: clientIssues || [],
      summary: clientSummary || null,
      scanType: clientScanType || 'url'
    };

    // Save to history if user is logged in
    let checkRecord = null;
    if (req.user) {
      checkRecord = await URLCheckHistory.create(threatData);

      // Update user metrics
      if (safetyCheck.isSafe) {
        await req.user.updateMetrics({ safeWebsites: 1 });
      } else {
        await req.user.updateMetrics({
          unsafeUrls: 1,
          phishingUrls: safetyCheck.threatType === 'phishing' ? 1 : 0,
          threatUrls: safetyCheck.threatType === 'suspicious' ? 1 : 0,
          protectionWarnings: 1,
        });
      }
    }

    // Update platform analytics
    const analytics = await Analytics.getAnalytics();
    if (safetyCheck.isSafe) {
      await analytics.updatePlatformMetrics({ safeWebsites: 1 });
    } else {
      const metrics = { protectionWarnings: 1 };
      if (safetyCheck.threatType === 'phishing') {
        metrics.phishingUrls = 1;
      } else {
        metrics.unsafeUrls = 1;
      }
      await analytics.updatePlatformMetrics(metrics);
      await analytics.updateTopPhishingDomains(domain);
    }

    // Update daily statistics
    await analytics.updateDailyStats({
      urlsChecked: 1,
      threatsDetected: safetyCheck.isSafe ? 0 : 1,
      protectionWarnings: safetyCheck.isSafe ? 0 : 1,
    });

    console.log(`[SCAN-URL] Daily stats after update:`, analytics.dailyStats);

    res.status(200).json({
      success: true,
      message: threatData.isSafe ? 'URL is safe' : 'URL appears to be unsafe or phishing',
      data: {
        url: sanitizedURL,
        domain: domain,
        isSafe: threatData.isSafe,
        threatType: threatData.threatType,
        threatLevel: threatData.threatLevel,
        confidence: threatData.confidence,
        recommendation: threatData.isSafe
          ? 'This URL appears to be safe. However, always exercise caution online.'
          : 'We recommend not visiting this URL. It may be a phishing or malicious site.',
        checkId: checkRecord ? checkRecord._id : null,
        record: checkRecord || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ======================== CHECK EMAIL SAFETY ========================
router.post('/email', optionalAuthMiddleware, async (req, res, next) => {
  try {
    const { senderEmail, emailContent, subject } = req.body;

    // Validation
    if (!senderEmail || !emailContent) {
      return res.status(400).json({
        success: false,
        message: 'Sender email and email content are required',
      });
    }

    // Extract URLs from email content
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = emailContent.match(urlRegex) || [];
    const subject_urls = subject ? subject.match(urlRegex) || [] : [];
    const allURLs = [...new Set([...urls, ...subject_urls])]; // Remove duplicates

    // Check each URL found in email
    const urlChecks = [];
    let hasThreats = false;

    for (const url of allURLs) {
      try {
        if (isValidURL(url)) {
          const safetyCheck = checkURLSafety(url);
          urlChecks.push({
            url,
            ...safetyCheck,
          });
          if (!safetyCheck.isSafe) {
            hasThreats = true;
          }
        }
      } catch {
        // Skip invalid URLs
      }
    }

    // Check sender email for phishing indicators (defensive: handle malformed senderEmail)
    const senderDomain = (typeof senderEmail === 'string' && senderEmail.includes('@')) ? senderEmail.split('@')[1].toLowerCase() : null;
    const suspiciousSenderIndicators = [
      'noreply', 'alert', 'urgent', 'confirm', 'verify',
      'update', 'security', 'action', 'required', 'support'
    ];
    const isSuspiciousSender = !!senderDomain && suspiciousSenderIndicators.some(
      (indicator) => senderDomain.includes(indicator)
    );

    const isSafeEmail = !hasThreats && !isSuspiciousSender;

    // Save to history if user is logged in; avoid duplicates within short window
    let emailRecord = null;
    if (req.user) {
      const { isSafe: clientIsSafe, threatLevel: clientThreatLevel, threatType: clientThreatType, confidence: clientConfidence, indicators: clientIndicators, issues: clientIssues, summary: clientSummary } = req.body || {};

      const recordData = {
        userId: req.user._id,
        url: senderEmail,
        senderEmail: senderEmail,
        domain: senderDomain || 'unknown.local',
        isSafe: typeof clientIsSafe !== 'undefined' ? clientIsSafe : isSafeEmail,
        threatType: clientThreatType || (isSuspiciousSender ? 'phishing' : 'unknown'),
        threatLevel: clientThreatLevel || (isSuspiciousSender ? 'high' : (hasThreats ? 'medium' : 'low')),
        detectionSource: 'machine_learning',
        confidence: typeof clientConfidence !== 'undefined' ? clientConfidence : (isSafeEmail ? 100 : 70),
        userWarned: !isSafeEmail,
        warningType: !isSafeEmail ? 'banner' : 'none',
        userAction: 'pending',
        indicators: clientIndicators || urlChecks.map(u=>u.threatType),
        issues: clientIssues || urlChecks.map(u=>u.url),
        summary: clientSummary || null,
        scanType: 'email'
      };

      // Deduplicate recent identical email records
      const recent = await URLCheckHistory.findOne({ userId: req.user._id, url: senderEmail }).sort({ checkedAt: -1 }).exec();
      if (recent && (Date.now() - new Date(recent.checkedAt).getTime()) < 5000) {
        emailRecord = recent;
        console.log('[scan] Reusing recent email record for user', req.user._id.toString());
      } else {
        // Log recordData to help debugging validation errors (full object)
        try {
          console.log('[scan] Creating email record for user:', req.user._id.toString());
          console.log('[scan] recordData:', JSON.stringify(recordData));
          emailRecord = await URLCheckHistory.create(recordData);
          console.log('[scan] Created EmailCheckHistory record', emailRecord._id);
        } catch (createErr) {
          console.error('[scan] Failed to create EmailCheckHistory record:', createErr && createErr.stack ? createErr.stack : createErr);
          // If validation error, provide details to client to avoid opaque 500
          if (createErr && createErr.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: 'Invalid email record data', errors: Object.values(createErr.errors).map(e => e.message) });
          }
          // For other errors, log and return 500 with message
          return res.status(500).json({ success: false, message: 'Failed saving email scan', error: createErr && createErr.message ? createErr.message : String(createErr) });
        }
      }

      // Update user metrics
      await req.user.updateMetrics({
        phishingUrls: isSafeEmail ? 0 : 1,
        protectionWarnings: isSafeEmail ? 0 : 1,
      });
    }

    // Update analytics
    const analytics = await Analytics.getAnalytics();
    if (isSafeEmail) {
      await analytics.updatePlatformMetrics({ safeWebsites: 1 });
    } else {
      // Categorize email threat properly (phishing, unsafe, or suspicious)
      const emailThreatType = isSuspiciousSender ? 'phishing' : 'unsafe';
      const metrics = { protectionWarnings: 1 };
      if (emailThreatType === 'phishing') {
        metrics.phishingUrls = 1;
      } else {
        metrics.unsafeUrls = 1;
      }
      await analytics.updatePlatformMetrics(metrics);
    }

    // Update daily statistics
    await analytics.updateDailyStats({
      urlsChecked: 1,
      threatsDetected: isSafeEmail ? 0 : 1,
      protectionWarnings: isSafeEmail ? 0 : 1,
    });

    res.status(200).json({
      success: true,
      message: isSafeEmail ? 'Email appears to be safe' : 'Email contains suspicious elements',
      data: {
        isSafe: typeof (req.body && req.body.isSafe) !== 'undefined' ? req.body.isSafe : isSafeEmail,
        senderEmail: senderEmail,
        senderDomain: senderDomain,
        isSuspiciousSender: isSuspiciousSender,
        urlsFound: allURLs.length,
        urlChecks: urlChecks,
        recommendation: isSafeEmail
          ? 'This email appears to be legitimate.'
          : 'This email shows signs of being a phishing attempt. Do not click links or provide personal information.',
        recordId: emailRecord ? emailRecord._id : null,
        record: emailRecord || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ======================== BATCH CHECK URLs ========================
router.post('/batch', authMiddleware, async (req, res, next) => {
  try {
    const { urls } = req.body;

    // Validation
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'URLs must be an array with at least one URL',
      });
    }

    if (urls.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 100 URLs can be checked at once',
      });
    }

    const results = [];
    let safeCount = 0;
    let unsafeCount = 0;

    for (const url of urls) {
      try {
        const sanitizedURL = sanitizeURL(url);

        if (!isValidURL(sanitizedURL)) {
          results.push({
            url,
            error: 'Invalid URL format',
          });
          continue;
        }

        const domain = extractDomain(sanitizedURL);
        const safetyCheck = checkURLSafety(sanitizedURL);

        results.push({
          url: sanitizedURL,
          domain: domain,
          isSafe: safetyCheck.isSafe,
          threatType: safetyCheck.threatType,
          threatLevel: safetyCheck.threatLevel,
          confidence: safetyCheck.confidence,
        });

        // Record in history
        await URLCheckHistory.create({
          userId: req.user._id,
          url: sanitizedURL,
          domain: domain,
          isSafe: safetyCheck.isSafe,
          threatType: safetyCheck.threatType,
          threatLevel: safetyCheck.threatLevel,
          detectionSource: 'database',
          confidence: safetyCheck.confidence,
          userWarned: !safetyCheck.isSafe,
          warningType: safetyCheck.isSafe ? 'none' : 'banner',
          userAction: 'pending',
        });

        if (safetyCheck.isSafe) {
          safeCount++;
        } else {
          unsafeCount++;
        }
      } catch {
        results.push({
          url,
          error: 'Failed to check URL',
        });
      }
    }

    // Update user metrics
    if (safeCount > 0 || unsafeCount > 0) {
      await req.user.updateMetrics({
        safeWebsites: safeCount,
        unsafeUrls: unsafeCount,
        protectionWarnings: unsafeCount,
      });
    }

    // Update platform analytics
    const analytics = await Analytics.getAnalytics();
    await analytics.updatePlatformMetrics({
      safeWebsites: safeCount,
      unsafeUrls: unsafeCount,
      protectionWarnings: unsafeCount,
    });

    // Update daily statistics
    await analytics.updateDailyStats({
      urlsChecked: urls.length,
      threatsDetected: unsafeCount,
      protectionWarnings: unsafeCount,
    });

    res.status(200).json({
      success: true,
      message: `Batch check complete. ${safeCount} safe, ${unsafeCount} unsafe.`,
      data: {
        total: urls.length,
        safeCount: safeCount,
        unsafeCount: unsafeCount,
        results: results,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ======================== GET FILTERED REPORTS ========================
// Get scan reports within a specified time range
router.get('/reports/filtered', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { timeRange } = req.query;

    // Validate time range
    const validTimeRanges = ['7days', '1month', '2months', '3months', '4months', '5months', '6months'];
    if (!timeRange || !validTimeRanges.includes(timeRange)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time range. Valid options: 7days, 1month, 2months, 3months, 4months, 5months, 6months',
      });
    }

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    const timeRangeMap = {
      '7days': 7,
      '1month': 30,
      '2months': 60,
      '3months': 90,
      '4months': 120,
      '5months': 150,
      '6months': 180,
    };

    const days = timeRangeMap[timeRange];
    startDate.setDate(now.getDate() - days);

    // Query reports within time range
    const reports = await URLCheckHistory.find({
      userId: userId,
      checkedAt: {
        $gte: startDate,
        $lte: now,
      },
    })
      .sort({ checkedAt: -1 })
      .limit(1000);

    // Calculate statistics
    const stats = {
      total: reports.length,
      safe: reports.filter((r) => r.isSafe).length,
      phishing: reports.filter((r) => r.threatType === 'phishing').length,
      malware: reports.filter((r) => r.threatType === 'malware').length,
      unsafe: reports.filter((r) => r.threatType === 'unsafe').length,
      suspicious: reports.filter((r) => r.threatType === 'suspicious').length,
    };

    res.status(200).json({
      success: true,
      message: `Found ${reports.length} reports for ${timeRange}`,
      data: {
        timeRange,
        dateRange: {
          start: startDate,
          end: now,
        },
        stats,
        reports: reports.map((r) => ({
          _id: r._id,
          url: r.url,
          domain: r.domain,
          isSafe: r.isSafe,
          threatType: r.threatType,
          threatLevel: r.threatLevel,
          confidence: r.confidence,
          checkedAt: r.checkedAt,
          detectionSource: r.detectionSource,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ======================== DELETE SINGLE SCAN ENTRY ========================
// Allows a user to delete a single scan history entry that belongs to them
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const id = req.params.id;
    const userId = req.user._id;

    const deleted = await URLCheckHistory.findOneAndDelete({ _id: id, userId: userId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Scan entry not found' });
    }

    return res.status(200).json({ success: true, message: 'Scan entry deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
