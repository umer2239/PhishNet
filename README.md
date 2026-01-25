# PhishNet - AI-Powered Phishing Detection Platform

A comprehensive full-stack phishing protection platform with Express/MongoDB backend and modern frontend. PhishNet uses advanced AI to detect phishing emails and URLs in real-time, providing detailed threat analysis and security reports.

## 🌟 Key Features

### 🔒 Security Scanning
- **URL Scanning**: Real-time phishing detection for suspicious links
- **Email Scanning**: AI-powered email content analysis for phishing attempts
- **Confidence Scoring**: Detailed threat confidence percentages (0-100%)
- **Risk Level Assessment**: Categorized as Safe, Suspicious, or Malicious
- **Real-time Analysis**: Instant scan results with detailed threat indicators

### 📊 Dashboard & Analytics
- **User Dashboard**: Personalized dashboard with scan statistics
- **Threat Overview Chart**: Visual 7-day threat trend analysis using Chart.js
- **Scan History**: Complete history of all URL and email scans
- **Recent Scans Table**: Quick access to latest security scans (responsive on mobile)
- **Statistics Cards**: Total scans, threats detected, and safe scans metrics

### 📝 Advanced Reporting
- **Detailed Scan Reports**: Comprehensive analysis of each scan
- **PDF Export**: Professional PDF report generation with custom layouts
- **Threat Indicators**: Visual display of security features and detected issues
- **Classification Reasoning**: Clear explanations of scan results
- **URL Truncation**: Smart URL display (max 90 chars) in reports
- **Report Filtering**: Filter by scan type, threat level, and date range
- **Modal View**: Detailed report preview with expandable sections

### 🤖 AI Chatbot (Google Gemini)
- **Interactive Support**: AI-powered chatbot for instant help
- **Greeting Bubble**: Professional welcome message above chatbot icon
- **Click-to-Open**: Greeting message is clickable to open chat
- **Wink Animation**: Friendly bot eye animation on all devices
- **Available on All Pages**: Persistent chatbot across entire website
- **Secure API Proxy**: Backend proxy to protect API keys

### 🎨 User Interface
- **Modern Design**: Clean, professional dark theme with PhishNet branding
- **Responsive Layout**: Fully optimized for desktop, tablet, and mobile
- **Smooth Animations**: Fade-in animations on all pages for polished UX
- **Mobile-Optimized Tables**: Horizontal scroll with all columns visible
- **Interactive Cards**: Hover effects and transitions
- **Professional Badges**: Color-coded threat level indicators

### 👤 User Management
- **User Authentication**: Secure login/signup with JWT tokens
- **Profile Management**: Update personal information and avatar
- **Settings Page**: Comprehensive user preferences
- **Password Reset**: Forgot password functionality
- **Session Management**: Secure token-based authentication

### 📰 Content Pages
- **Blog System**: Cybersecurity blog with RSS feed integration
- **About Page**: Company information and mission statement
- **FAQ Page**: Interactive accordion with common questions
- **Pricing Page**: Tiered pricing plans (Free, Pro, Enterprise)
- **Privacy Policy**: Comprehensive privacy documentation
- **Terms of Service**: Legal terms and conditions
- **Demo Videos**: Product demonstration pages

### 🔐 Security Features
- **Content Security Policy**: Helmet.js with strict CSP headers
- **Rate Limiting**: API request throttling to prevent abuse
- **Input Sanitization**: MongoDB injection protection
- **CORS Configuration**: Controlled cross-origin resource sharing
- **JWT Authentication**: Secure token-based auth
- **Data Encryption**: Secure password hashing

## 📁 Project Structure

```
Webpage/
├─ Backend/                    # Express API server
│  ├─ server.js               # Main server file with security middleware
│  ├─ routes/                 # API routes
│  │  ├─ auth.js             # Authentication endpoints
│  │  ├─ users.js            # User management
│  │  ├─ scan.js             # URL/Email scanning
│  │  ├─ analytics.js        # Dashboard statistics
│  │  ├─ chatbot.js          # Gemini chatbot proxy
│  │  ├─ blog.js             # Blog RSS feed
│  │  └─ dashboard.js        # Dashboard data
│  ├─ controllers/            # Business logic
│  │  ├─ authController.js
│  │  ├─ urlController.js
│  │  ├─ userController.js
│  │  ├─ analyticsController.js
│  │  └─ blogController.js
│  ├─ models/                 # MongoDB schemas
│  │  ├─ User.js
│  │  ├─ URLCheckHistory.js
│  │  └─ Analytics.js
│  ├─ middleware/             # Custom middleware
│  │  ├─ auth.js             # JWT verification
│  │  └─ errorHandler.js     # Error handling
│  ├─ utils/                  # Utility functions
│  │  ├─ jwt.js              # Token generation
│  │  ├─ validators.js       # Input validation
│  │  └─ api.js              # API helpers
│  └─ config/
│     └─ database.js         # MongoDB connection
├─ Frontend Pages
│  ├─ index.html             # Landing page with hero section
│  ├─ dashboard.html         # User dashboard with charts
│  ├─ login.html             # Login page
│  ├─ signup.html            # Registration page
│  ├─ reports.html           # Scan reports with filtering
│  ├─ settings.html          # User settings
│  ├─ about.html             # About us page
│  ├─ blog.html              # Cybersecurity blog
│  ├─ faq.html               # FAQ accordion
│  ├─ pricing.html           # Pricing plans
│  ├─ privacy.html           # Privacy policy
│  ├─ terms.html             # Terms of service
│  └─ demo.html              # Product demos
├─ Chatbot Widget
│  ├─ chatbot-widget.html    # Reusable chatbot snippet
│  ├─ chatbot.js             # Chatbot logic (Gemini integration)
│  └─ chatbot.css            # Chatbot styles with animations
├─ JavaScript
│  ├─ app.js                 # Core app logic, navigation
│  ├─ chart-init.js          # Chart.js initialization
│  ├─ reports.js             # Report management & PDF generation
│  ├─ settings.js            # Settings page logic
│  ├─ blog.js                # Blog feed parser
│  ├─ scanning-system.js     # URL/Email scanning system
│  └─ scan-results.js        # Scan results display
├─ Styles
│  ├─ styles.css             # Main stylesheet (4200+ lines)
│  └─ chatbot.css            # Chatbot-specific styles
├─ Documentation
│  ├─ README.md              # This file
│  ├─ API_REFERENCE.md       # API endpoints documentation
│  ├─ BACKEND_SETUP.md       # Backend setup guide
│  ├─ QUICKSTART.md          # 5-minute quick start
│  ├─ SCHEMA_DOCUMENTATION.md # Database schemas
│  ├─ PROJECT_STRUCTURE.md   # Project organization
│  └─ MODAL_QUICK_REFERENCE.md # Modal system guide
└─ Scripts
   ├─ run-server.sh          # Linux/Mac server launcher
   └─ run-server.bat         # Windows server launcher
```

## 🚀 Quick Start
- Node.js 14+ and npm 6+
- MongoDB Atlas cluster (or local MongoDB)
- Git (optional, for development)

## Quick Start (development)
### Prerequisites
- Node.js 14+ and npm 6+
- MongoDB Atlas cluster (or local MongoDB)
- Google Gemini API key (for chatbot)

### Installation Steps

1) **Install backend dependencies:**
   ```bash
   cd Backend
   npm install
   ```

2) **Configure environment variables:**
   - Copy the sample env file: 
     ```bash
     # Windows
     copy ..\.env.example .env
     
     # macOS/Linux
     cp ../.env.example .env
     ```
   - Update `.env` with your values:
     - `MONGODB_URI` - Your MongoDB connection string
     - `JWT_SECRET` - Random secret key for JWT tokens
     - `GEMINI_API_KEY` - Your Google Gemini API key
     - `CORS_ORIGIN` - Allowed origins (e.g., http://localhost:3000)
     - `PORT` - Server port (default: 3000)

3) **Run the backend server:**
   ```bash
   npm run dev      # Development mode with auto-reload
   # or
   npm start        # Production mode
   ```

4) **Access the application:**
   - Open http://localhost:3000 in your browser
   - API base URL: http://localhost:3000/api

> **Helper Scripts:** You can also use `./run-server.sh` (bash) or `./run-server.bat` (Windows) from the repo root.

## 🔧 Environment Variables

Create a `.env` file in the `Backend/` directory:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/phishnet

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here-minimum-32-characters

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000

# AI Chatbot
GEMINI_API_KEY=your-google-gemini-api-key-here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - User login (returns JWT)
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token

### User Management
- `GET /api/users/profile` - Get user profile (auth required)
- `PUT /api/users/profile` - Update user profile (auth required)
- `GET /api/users/history` - Get scan history (auth required)

### Scanning
- `POST /api/scan/url` - Scan a URL for phishing
- `POST /api/scan/email` - Scan email content for phishing
- `GET /api/scan/history` - Get user's scan history (auth required)

### Analytics
- `GET /api/analytics/dashboard` - Dashboard statistics (auth required)
- `GET /api/analytics/threat-overview` - 7-day threat chart data (auth required)

### Chatbot
- `POST /api/chatbot/message` - Send message to AI chatbot
- Supports text messages and file attachments
- Powered by Google Gemini AI

### Blog
- `GET /api/blog/feed` - Fetch cybersecurity blog posts
- Aggregates from multiple RSS feeds

### Health Check
- `GET /api/health` - Server health status

For detailed API documentation, see [API_REFERENCE.md](API_REFERENCE.md)

## 🎨 Frontend Features

### Pages Overview
- **Landing Page** (`index.html`) - Hero section, quick scan demo, features showcase
- **Dashboard** (`dashboard.html`) - User stats, threat charts, recent scans table
- **Reports** (`reports.html`) - Detailed scan reports with filtering and PDF export
- **Settings** (`settings.html`) - Profile management, avatar upload, preferences
- **Blog** (`blog.html`) - Cybersecurity news and articles
- **Authentication** (`login.html`, `signup.html`) - Secure user auth pages

### UI Components
- **Responsive Navigation** - Auto-updates based on auth state
- **Modal System** - Reusable modal components throughout
- **Toast Notifications** - Success, error, and info alerts
- **Loading States** - Spinners and skeleton screens
- **Form Validation** - Client-side input validation
- **Chart Visualizations** - Chart.js for analytics

### Chatbot Widget
- **Integration**: Included on all pages via `chatbot-widget.html`
- **Features**: 
  - Greeting message bubble (clickable)
  - Wink animation on chatbot icon
  - File attachment support
  - Typing indicators
  - Markdown formatting in responses
  - Session persistence
- **Customization**: Modify `chatbot.css` for styling changes

## 🛠️ Development

### Key Technologies
- **Backend**: Express.js, MongoDB, Mongoose
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Security**: Helmet.js, express-rate-limit, JWT
- **AI**: Google Gemini API
- **Charts**: Chart.js
- **PDF**: jsPDF, html2canvas

### File Organization
