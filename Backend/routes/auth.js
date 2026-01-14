const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { isValidEmail, validatePassword } = require('../utils/validators');
const { authMiddleware } = require('../middleware/auth');

// ======================== REGISTER ========================
router.post('/register', async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors,
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // Create new user
    const user = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: password,
      isVerified: true, // Auto-verify for demo (in production, send verification email)
    });

    await user.save();

    // Generate JWT token
    const token = generateToken(user._id, user.email);

    // Add token to user's tokens array
    await user.addJWTToken(token);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.getProfile(),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ======================== LOGIN ========================
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Find user and get password hash
    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      const minutesLeft = Math.ceil(
        (user.accountLockedUntil.getTime() - Date.now()) / (1000 * 60)
      );
      return res.status(429).json({
        success: false,
        message: `Account is locked. Try again in ${minutesLeft} minutes`,
      });
    }

    // Compare password
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      user.loginAttempts += 1;

      // Lock account after 5 failed attempts
      if (user.loginAttempts >= 5) {
        await user.lockAccount(30);
        return res.status(429).json({
          success: false,
          message: 'Too many failed login attempts. Account locked for 30 minutes.',
        });
      }

      await user.save();

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        attemptsLeft: 5 - user.loginAttempts,
      });
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lastLogin = new Date();

    // Track IP address
    const clientIP = req.ip || req.connection.remoteAddress;
    const existingIP = user.ipAddresses.find((entry) => entry.ip === clientIP);
    if (existingIP) {
      existingIP.lastSeen = new Date();
    } else {
      user.ipAddresses.push({
        ip: clientIP,
        lastSeen: new Date(),
      });
    }

    // Generate JWT token
    const token = generateToken(user._id, user.email);

    // Add token to user's tokens array
    await user.addJWTToken(token);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.getProfile(),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ======================== LOGOUT ========================
router.post('/logout', authMiddleware, async (req, res, next) => {
  try {
    const user = req.user;
    const token = req.token;

    // Remove token from user's tokens array
    user.jwtTokens = user.jwtTokens.filter((t) => t.token !== token);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
});

// ======================== VERIFY TOKEN ========================
router.post('/verify', authMiddleware, async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        user: req.user.getProfile(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ======================== REFRESH TOKEN ========================
router.post('/refresh', authMiddleware, async (req, res, next) => {
  try {
    const user = req.user;

    // Generate new token
    const newToken = generateToken(user._id, user.email);

    // Add new token to user's tokens array
    await user.addJWTToken(newToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
