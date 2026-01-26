const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

// Load environment variables from Backend folder
dotenv.config({ path: path.join(__dirname, '.env') });

// Import database connection
const { connectDB } = require('./config/database');

// Import models
const User = require('./models/User');
const Analytics = require('./models/Analytics');
const URLCheckHistory = require('./models/URLCheckHistory');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const scanRoutes = require('./routes/scan');
const analyticsRoutes = require('./routes/analytics');
const chatbotRoutes = require('./routes/chatbot');
const blogRoutes = require('./routes/blog');
const dashboardRoutes = require('./routes/dashboard');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { authMiddleware, optionalAuthMiddleware } = require('./middleware/auth');
const { sanitizeURL, isValidURL, extractDomain } = require('./utils/validators');
const { scanUrlWithGoogleSafeBrowsing } = require('./utils/safeBrowsing');

// Initialize Express app
const app = express();

// ======================== SECURITY MIDDLEWARE ========================
// Helmet.js for security headers with CSP configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: [
        "'self'", 
        'data:', 
        'blob:',
        'https:',
        'https://feeds.feedburner.com', 
        'https://www.bleepingcomputer.com',
        'https://*.thehackernews.com',
        'https://*.bleepstatic.com',
        'https://*.cloudfront.net', 
        'https://*.akamaized.net', 
        'https://*.cdn.net'
      ],
      connectSrc: [
        "'self'", 
        'https://cdn.jsdelivr.net', 
        'https://feeds.feedburner.com', 
        'https://www.bleepingcomputer.com',
        'https://api.allorigins.win'  // For CORS proxy fallback
      ],
      frameSrc: ["'none'"],
    }
  }
}));

// Force-set CSP header to ensure no invalid sources remain in responses
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: https://feeds.feedburner.com https://www.bleepingcomputer.com https://*.thehackernews.com https://*.bleepstatic.com https://*.cloudfront.net https://*.akamaized.net https://*.cdn.net",
    "connect-src 'self' https://cdn.jsdelivr.net https://feeds.feedburner.com https://www.bleepingcomputer.com https://api.allorigins.win",
    "frame-src 'none'"
  ].join('; '));
  next();
});

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// CORS configuration (allow all in dev so file:// pages also work)
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['*'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or file://)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS not allowed for this origin'), false);
    },
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 900000), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 500), // limit each IP to 500 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// More lenient rate limiter for file uploads and profile updates
const uploadLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 50, // 50 requests per minute
  message: 'Too many upload requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to all routes
app.use(limiter);

// ======================== STATIC FILES ========================
// Serve static files (HTML, CSS, etc.) from parent directory
app.use(express.static(path.join(__dirname, '..'), {
  setHeaders: (res, filePath) => {
    // Set proper MIME types
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

// ======================== HEALTH CHECK ========================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ======================== THREAT DETECTION URL SCAN ========================
app.post('/api/scan-url', optionalAuthMiddleware, async (req, res, next) => {
  try {
    const { url } = req.body || {};

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'URL is required and must be a string',
      });
    }

    const sanitizedURL = sanitizeURL(url);
    if (!isValidURL(sanitizedURL)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL format. Please include the protocol (e.g., https://example.com).',
      });
    }

    const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'Threat detection service is not configured on the server.',
      });
    }

    const scanStartedAt = Date.now();
    const { status, threats } = await scanUrlWithGoogleSafeBrowsing(sanitizedURL, apiKey);
    const scanDurationMs = Date.now() - scanStartedAt;

    const threatList = Array.isArray(threats) ? threats : [];
    const domain = extractDomain(sanitizedURL);
    const hasThreats = threatList.length > 0;
    const hasMalware = threatList.some((t) => t.type === 'MALWARE');
    const hasPhishing = threatList.some((t) => t.type === 'SOCIAL_ENGINEERING' || t.type === 'PHISHING');
    const hasUnwanted = threatList.some((t) => t.type === 'UNWANTED_SOFTWARE');
    const normalizedThreatType = hasPhishing ? 'phishing' : hasMalware ? 'malware' : hasUnwanted ? 'unsafe' : 'safe';
    const threatLevel = status === 'MALICIOUS' ? 'high' : status === 'SUSPICIOUS' ? 'medium' : 'safe';
    const isSafe = status === 'SAFE';
    const indicators = hasThreats
      ? threatList.map((t) => `Flagged: ${t.type} (${t.platform})`)
      : ['No security threats detected'];
    const issues = hasThreats
      ? threatList.map((t) => `Security analysis identified ${t.type.replace(/_/g, ' ')} threat for this URL.`)
      : ['Security analysis completed - No threats found'];

    if (req.user) {
      await URLCheckHistory.create({
        userId: req.user._id,
        url: sanitizedURL,
        domain,
        scanType: 'url',
        isSafe,
        threatType: normalizedThreatType,
        threatLevel,
        indicators,
        issues,
        summary: isSafe 
          ? 'Our comprehensive security analysis has completed a thorough examination of this URL and found no indicators of malicious activity, phishing attempts, or unwanted software. This resource appears legitimate and safe for user interaction.'
          : hasPhishing || hasMalware
            ? `This URL has been identified as a significant security threat. Our threat detection engine has flagged this resource for ${hasMalware ? 'malware distribution' : ''}${hasMalware && hasPhishing ? ' and ' : ''}${hasPhishing ? 'phishing attempts' : ''}. We strongly recommend avoiding this URL entirely.`
            : 'This URL exhibits suspicious characteristics that warrant caution. Security analysis detected potentially unwanted software or deceptive practices. We recommend verification before interacting with this resource.',
        detectionSource: 'api',
        confidence: isSafe ? 98 : 99,
        threatCategories: threatList.map((t) => t.type),
        threatsDetected: threatList.map((t) => ({ name: t.type, severity: threatLevel })),
        riskLevel: threatLevel,
        riskPercent: isSafe ? 2 : status === 'MALICIOUS' ? 95 : 60,
        userWarned: !isSafe,
        warningType: isSafe ? 'none' : 'banner',
        userAction: 'pending',
      });

      await req.user.updateMetrics({
        safeWebsites: isSafe ? 1 : 0,
        unsafeUrls: isSafe ? 0 : status === 'MALICIOUS' ? 1 : 0,
        threatUrls: isSafe ? 0 : status === 'SUSPICIOUS' ? 1 : 0,
        phishingUrls: hasPhishing ? 1 : 0,
        protectionWarnings: isSafe ? 0 : 1,
      });
    }

    const analytics = await Analytics.getAnalytics();
    await analytics.updatePlatformMetrics({
      safeWebsites: isSafe ? 1 : 0,
      unsafeUrls: isSafe ? 0 : status === 'MALICIOUS' ? 1 : 0,
      threatUrls: isSafe ? 0 : status === 'SUSPICIOUS' ? 1 : 0,
      phishingUrls: hasPhishing ? 1 : 0,
      protectionWarnings: isSafe ? 0 : 1,
    });
    await analytics.updateDailyStats({
      urlsChecked: 1,
      threatsDetected: isSafe ? 0 : 1,
      protectionWarnings: isSafe ? 0 : 1,
    });
    if (!isSafe && hasPhishing) {
      await analytics.updateTopPhishingDomains(domain);
    }

    res.status(200).json({
      success: true,
      status,
      threats: threatList,
      meta: {
        url: sanitizedURL,
        domain,
        durationMs: scanDurationMs,
      },
    });
  } catch (error) {
    const statusCode = error?.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error?.message || 'Failed to scan URL with threat detection service',
    });
  }
});

// ======================== API ROUTES ========================
// Authentication routes (no auth required)
app.use('/api/auth', authRoutes);

// URL Scanning routes (public - no auth required for basic scan)
app.use('/api/scan', scanRoutes);

// Chatbot routes (public - works for both logged in and guest users)
app.use('/api/chatbot', chatbotRoutes);

// Blog routes (public - no auth required, auto-updated from RSS)
app.use('/api/blogs', blogRoutes);

// Public analytics endpoint (for About Us page stats)
app.get('/api/analytics/platform-stats', async (req, res, next) => {
  try {
    const Analytics = require('./models/Analytics');
    const User = require('./models/User');
    
    const analytics = await Analytics.getAnalytics();
    
    // Calculate active users (users who logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeUsersCount = await User.countDocuments({
      isActive: true,
      lastLogin: { $gte: thirtyDaysAgo }
    });
    
    // Also get total users count
    const totalUsers = await User.countDocuments({ isActive: true });

    // Get today's scan count directly from scan history
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scansToday = await URLCheckHistory.countDocuments({ checkedAt: { $gte: today } });

    // Compute detection rate for the last 6 months from actual scan records (URL + Email)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
    const totalScans6m = await URLCheckHistory.countDocuments({ checkedAt: { $gte: sixMonthsAgo } });
    const threats6m = await URLCheckHistory.countDocuments({ checkedAt: { $gte: sixMonthsAgo }, isSafe: false });
    const detectionRate6m = totalScans6m > 0 ? parseFloat(((threats6m / totalScans6m) * 100).toFixed(1)) : 0;

    res.status(200).json({
      success: true,
      message: 'Platform statistics retrieved successfully',
      data: {
        totalUsersOnboarded: totalUsers,
        activeUsers: activeUsersCount,
        totalUrlsChecked: analytics.totalUrlsChecked,
        scansToday: scansToday,
        scansLastSixMonths: totalScans6m,
        threatsLastSixMonths: threats6m,
        detectionRateLastSixMonths: detectionRate6m,
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

// Protected routes - require authentication
app.use('/api/users', authMiddleware, uploadLimiter, userRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);

// ======================== ROOT ROUTE ========================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ======================== 404 HANDLER ========================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ======================== ERROR HANDLER ========================
app.use(errorHandler);

// ======================== DATABASE CONNECTION & SERVER START ========================
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✓ Database connected successfully');

    // Ensure Analytics document exists (singleton pattern)
    const existingAnalytics = await Analytics.findOne({});
    if (!existingAnalytics) {
      await Analytics.create({});
      console.log('✓ Analytics document created');
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log(`\n✓ PhishNet Server is running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ API endpoint: http://localhost:${PORT}/api\n`);

      if (process.env.NODE_ENV !== 'production') {
        console.log('Available endpoints:');
        console.log('  POST   /api/auth/register         - Register new user');
        console.log('  POST   /api/auth/login            - Login user');
        console.log('  POST   /api/auth/logout           - Logout user (protected)');
        console.log('  POST   /api/scan/url              - Check URL safety');
        console.log('  POST   /api/scan/email            - Check email safety');
        console.log('  GET    /api/users/profile         - Get user profile (protected)');
        console.log('  PUT    /api/users/profile         - Update user profile (protected)');
        console.log('  GET    /api/users/history         - Get check history (protected)');
        console.log('  GET    /api/analytics/dashboard   - Get dashboard data (protected)');
        console.log('  GET    /api/analytics/trends      - Get trending data (protected)');
        console.log('  GET    /api/analytics/summary     - Get platform summary (protected)\n');
      }
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n✓ Shutting down server gracefully...');
  try {
    await require('./config/database').disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start the server
startServer();

module.exports = app;
