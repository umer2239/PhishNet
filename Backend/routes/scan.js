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

    // Check URL safety
    const safetyCheck = checkURLSafety(sanitizedURL);

    // Prepare threat data
    const threatData = {
      userId: req.user ? req.user._id : null,
      url: sanitizedURL,
      domain: domain,
      isSafe: safetyCheck.isSafe,
      threatType: safetyCheck.threatType,
      threatLevel: safetyCheck.threatLevel,
      detectionSource: 'database',
      confidence: safetyCheck.isSafe ? 100 : Math.max(50, 100 - safetyCheck.suspicionScore),
      userWarned: !safetyCheck.isSafe,
      warningType: safetyCheck.isSafe ? 'none' : 'banner',
      userAction: 'pending',
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

    res.status(200).json({
      success: true,
      message: safetyCheck.isSafe ? 'URL is safe' : 'URL appears to be unsafe or phishing',
      data: {
        url: sanitizedURL,
        domain: domain,
        isSafe: safetyCheck.isSafe,
        threatType: safetyCheck.threatType,
        threatLevel: safetyCheck.threatLevel,
        confidence: safetyCheck.confidence,
        recommendation: safetyCheck.isSafe
          ? 'This URL appears to be safe. However, always exercise caution online.'
          : 'We recommend not visiting this URL. It may be a phishing or malicious site.',
        checkId: checkRecord ? checkRecord._id : null,
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

    // Check sender email for phishing indicators
    const senderDomain = senderEmail.split('@')[1];
    const suspiciousSenderIndicators = [
      'noreply', 'alert', 'urgent', 'confirm', 'verify',
      'update', 'security', 'action', 'required', 'support'
    ];
    const isSuspiciousSender = suspiciousSenderIndicators.some(
      (indicator) => senderDomain.toLowerCase().includes(indicator)
    );

    const isSafeEmail = !hasThreats && !isSuspiciousSender;

    // Save to history if user is logged in
    let emailRecord = null;
    if (req.user && !isSafeEmail) {
      emailRecord = await URLCheckHistory.create({
        userId: req.user._id,
        url: senderEmail,
        domain: senderDomain,
        isSafe: isSafeEmail,
        threatType: 'phishing',
        threatLevel: isSuspiciousSender ? 'high' : 'medium',
        detectionSource: 'machine_learning',
        confidence: 70,
        userWarned: true,
        warningType: 'banner',
        userAction: 'pending',
      });

      // Update user metrics
      await req.user.updateMetrics({
        phishingUrls: 1,
        protectionWarnings: 1,
      });
    }

    // Update analytics
    if (!isSafeEmail) {
      const analytics = await Analytics.getAnalytics();
      await analytics.updatePlatformMetrics({
        phishingUrls: 1,
        protectionWarnings: 1,
      });
    }

    res.status(200).json({
      success: true,
      message: isSafeEmail ? 'Email appears to be safe' : 'Email contains suspicious elements',
      data: {
        isSafe: isSafeEmail,
        senderEmail: senderEmail,
        senderDomain: senderDomain,
        isSuspiciousSender: isSuspiciousSender,
        urlsFound: allURLs.length,
        urlChecks: urlChecks,
        recommendation: isSafeEmail
          ? 'This email appears to be legitimate.'
          : 'This email shows signs of being a phishing attempt. Do not click links or provide personal information.',
        recordId: emailRecord ? emailRecord._id : null,
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

module.exports = router;
