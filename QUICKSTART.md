# 🚀 PhishNet Quick Start (5 Minutes)

## Get Your Backend Running in 5 Easy Steps

### Step 1: Install Dependencies (1 minute)
```bash
npm install
```

### Step 2: Set Up MongoDB (2 minutes)

**Option A: Free MongoDB Atlas (Recommended)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up (free account)
3. Create a free cluster
4. Click "Connect" → "Connect your application"
5. Copy the connection string
6. Save it for next step

**Option B: Local MongoDB**
- If you have MongoDB installed locally:
```
mongodb://localhost:27017/phishnet
```

### Step 3: Configure Environment (1 minute)

Create `.env` file in root directory:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/phishnet?retryWrites=true&w=majority
JWT_SECRET=MySecretKeyChangeThis1234567890!
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000,http://localhost:5000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

> Replace `username`, `password`, and `cluster` with your actual MongoDB details!

### Step 4: Start Backend (1 minute)

```bash
npm run dev
```

You should see:
```
✓ MongoDB Connected
✓ PhishNet Server is running on port 3000
```

### Step 5: Test It! (0 minutes - it's already running)

Open your browser: **http://localhost:3000**

---

## 🧪 Quick Test

1. **Register**: Click "Sign Up" and create account
2. **Login**: Enter credentials
3. **Scan URL**: Type a URL and click scan
4. **Dashboard**: View your stats

---

## 📌 Troubleshooting Quick Fixes

### "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

### "Port 3000 already in use"
```bash
# On Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# On Mac/Linux
lsof -i :3000
kill -9 <PID>
```

### "MongoDB connection failed"
- Check MONGODB_URI in .env
- Verify IP whitelist in MongoDB Atlas (should allow your IP)
- Test connection: `mongo "mongodb+srv://..."`

---

## 📖 Full Documentation

- **Setup Guide**: See `BACKEND_SETUP.md`
- **Database Schema**: See `SCHEMA_DOCUMENTATION.md`
- **Integration Details**: See `INTEGRATION_SUMMARY.md`

---

## ✅ It Works When You See:

```
✓ Database connected successfully
✓ PhishNet Server is running on port 3000
✓ Environment: development
✓ API endpoint: http://localhost:3000/api
```

And you can access: **http://localhost:3000** in your browser

---

## 🎯 Next Steps

1. Test registration/login
2. Scan some URLs  
3. View dashboard statistics
4. Read full docs for advanced setup

---

**Everything is ready! Start with `npm run dev` and enjoy!** 🎉
