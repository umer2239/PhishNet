# PhishNet - Static Demo Website

## Overview
This is a **pure static demo website** with NO backend dependencies. Everything runs in the browser using HTML, CSS, and plain JavaScript only.

## Features

### ✅ Demo Authentication
- **Login**: Accepts any email and password combination
- **Signup**: Creates demo accounts stored in localStorage
- **Fast**: Login completes in ~500ms
- **Session**: Persists until logout or browser data cleared

### ✅ Demo Scanning
- **URL Scanning**: Test any URL for phishing threats
- **Email Scanning**: Analyze email content for suspicious patterns
- **Random Results**: Generates realistic threat levels (safe/suspicious/malicious)
- **Guest Limit**: One free scan, then requires "login"

### ✅ Navigation
- **Logged Out**: Pricing, Demo, Blog, About pages
- **Logged In**: Dashboard, Reports, Blog, Demo, Pricing, About pages
- **Smooth Transitions**: Animated navigation updates
- **User Avatar**: Shows user initials when logged in

## How to Run

### Option 1: Python HTTP Server
```bash
cd Webpage
python -m http.server 8000
```
Then open: http://localhost:8000

### Option 2: Node.js HTTP Server
```bash
cd Webpage
npx http-server -c-1 .
```
Then open: http://localhost:8080

### Option 3: VS Code Live Server
1. Install "Live Server" extension
2. Right-click on index.html
3. Select "Open with Live Server"

## File Structure

```
Webpage/
├── app.js              # All JavaScript logic (authentication, scanning, forms)
├── styles.css          # All styling
├── index.html          # Landing page
├── login.html          # Two-stage login form
├── signup.html         # Registration form
├── dashboard.html      # Main dashboard (requires login)
├── reports.html        # Scan reports (requires login)
├── settings.html       # User settings (requires login)
├── demo.html           # Public demo page
├── blog.html           # Blog posts
├── pricing.html        # Pricing information
├── about.html          # About page
├── faq.html            # FAQ with accordions
├── privacy.html        # Privacy policy
├── terms.html          # Terms of service
└── forgot-password.html # Password recovery (demo)
```

## Technical Details

### Authentication System
- **Storage**: localStorage (`phishnet_user` key)
- **No validation**: Any credentials accepted
- **Session**: Persists across page refreshes
- **Logout**: Clears localStorage and redirects to home

### Scan System
- **Simulated**: Random threat detection
- **Fast**: 1-second delay for realism
- **Results**: Confidence scores, threat indicators, timestamps
- **Guest limit**: One scan maximum

### No Dependencies
- ✅ No React, Vue, or frameworks
- ✅ No TypeScript compilation
- ✅ No build process required
- ✅ No backend API calls
- ✅ No database connections
- ✅ Pure HTML/CSS/JavaScript

## Testing the Demo

### Test Login
1. Go to [login.html](login.html)
2. Enter any email (e.g., `test@example.com`)
3. Enter any password
4. Click "Continue" → Redirects to dashboard

### Test Signup
1. Go to [signup.html](signup.html)
2. Fill in all fields (any values work)
3. Password must be "Good" strength (score ≥3)
4. Click "Create Account" → Redirects to dashboard

### Test Scanning
1. Go to [demo.html](demo.html)
2. Enter a URL (e.g., `https://example.com`)
3. Click "Scan URL"
4. View random scan results

## Browser Compatibility
- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ⚠️ IE11 not supported (uses modern JavaScript)

## Notes
- All data is stored locally in your browser
- Clearing browser data will log you out
- No actual phishing detection occurs (demo only)
- No real security features implemented

## Changes Made
- Removed all API/backend logic from app.js
- Removed api-service.js references from all HTML files
- Simplified authentication to localStorage only
- Optimized login speed (removed delays)
- Made all scanning demo-only with random results
- Cleaned up console logs and debug code

---

**Last Updated**: 2025
**Version**: Static Demo 1.0
