# PhishNet Project Structure

## 📁 Directory Organization

```
Webpage/
├── Backend/                    # All backend files
│   ├── server.js              # Express server
│   ├── package.json           # Backend dependencies
│   ├── .env                   # Environment variables
│   ├── config/
│   │   └── database.js        # MongoDB connection
│   ├── middleware/
│   │   ├── auth.js            # Authentication middleware
│   │   └── errorHandler.js    # Error handling middleware
│   ├── models/
│   │   ├── User.js            # User schema
│   │   ├── Analytics.js       # Analytics schema
│   │   └── URLCheckHistory.js # URL check history schema
│   ├── routes/
│   │   ├── auth.js            # Auth endpoints
│   │   ├── users.js           # User endpoints
│   │   ├── scan.js            # Scanning endpoints
│   │   └── analytics.js       # Analytics endpoints
│   └── utils/
│       ├── api.js             # API utilities
│       ├── jwt.js             # JWT utilities
│       └── validators.js      # Validation utilities
├── Frontend Files:            # Frontend files (root)
│   ├── *.html                 # HTML pages
│   ├── app.js                 # Frontend JavaScript
│   ├── styles.css             # Stylesheets
│   └── chart-init.js          # Chart initialization
├── run-server.bat             # Windows startup script
├── run-server.sh              # Linux/Mac startup script
└── Documentation
    ├── API_REFERENCE.md
    ├── BACKEND_SETUP.md
    └── QUICKSTART.md
```

## 🚀 How to Run

### Option 1: Using Startup Scripts
**Windows:**
```powershell
.\run-server.bat
```

**Mac/Linux:**
```bash
./run-server.sh
```

### Option 2: Manual Startup
```bash
cd Backend
npm install    # First time only
npm start
```

## 📋 Environment Variables

All environment variables should be set in `Backend/.env`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/phishnet
JWT_SECRET=your_secret_key
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

## 🔗 Frontend Integration

Frontend files (`app.js`, `*.html`, etc.) remain in the root directory and can access the backend API at:
- **API Base URL:** `http://localhost:3000/api`

All API calls from frontend automatically route to the Backend folder's Express server.

## ✅ Verification

After starting the server, you should see:
```
✓ MongoDB Connected: [connection-details]
✓ Database connected successfully
✓ PhishNet Server is running on port 3000
✓ API endpoint: http://localhost:3000/api
```

Then open your browser to:
- **Frontend:** `http://localhost:3000`
- **API Health Check:** `http://localhost:3000/api/health`

## 📝 Key Changes

1. **All backend code moved to `Backend/` folder**
2. **Frontend remains in root directory**
3. **Server automatically serves frontend static files**
4. **No duplicate files outside Backend folder**
5. **Clean separation of concerns**

## 🔧 Backend Configuration

The server.js has been configured to:
- Serve static files from parent directory (`../`)
- Load environment variables from `Backend/.env`
- Serve HTML pages from the root directory
- API routes available at `/api/*`
