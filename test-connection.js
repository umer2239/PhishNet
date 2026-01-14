// Simple script to test MongoDB connection without starting server
require('dotenv').config();
const mongoose = require('mongoose');

console.log('🔧 Testing MongoDB Connection...\n');

// Check if .env file is loaded
console.log('📋 Environment Variables:');
console.log('   MONGODB_URI:', process.env.MONGODB_URI ? '✓ Loaded' : '✗ NOT FOUND');
console.log('   JWT_SECRET:', process.env.JWT_SECRET ? '✓ Loaded' : '✗ NOT FOUND');
console.log('   PORT:', process.env.PORT || '3000');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'development\n');

if (!process.env.MONGODB_URI) {
  console.error('❌ ERROR: MONGODB_URI not found in .env file');
  process.exit(1);
}

// Show connection string (masked password)
const connectionString = process.env.MONGODB_URI;
const maskedString = connectionString.replace(/:(.+?)@/, ':****@');
console.log('📦 Connection String (masked):');
console.log('   ' + maskedString + '\n');

// Test connection
const testConnection = async () => {
  try {
    console.log('⏳ Connecting to MongoDB...');
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✓ MongoDB Connected Successfully!');
    console.log('   Host:', conn.connection.host);
    console.log('   Database:', conn.connection.name);
    console.log('   State:', conn.connection.readyState === 1 ? 'Connected' : 'Not Connected');

    // Try to list collections
    const collections = await conn.connection.db.listCollections().toArray();
    console.log('   Collections:', collections.length > 0 ? collections.map(c => c.name).join(', ') : 'None yet');

    console.log('\n✅ Everything looks good! Your MongoDB is working.\n');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection Failed!');
    console.error('   Error:', error.message);
    
    if (error.message.includes('ETIMEOUT')) {
      console.error('\n   ℹ️  This error means:');
      console.error('   - Your IP address may not be whitelisted in MongoDB Atlas');
      console.error('   - Or MongoDB Atlas Network Access is not configured');
      console.error('\n   📝 How to fix:');
      console.error('   1. Go to https://cloud.mongodb.com');
      console.error('   2. Click "Network Access" in the left sidebar');
      console.error('   3. Click "Add IP Address"');
      console.error('   4. Select "Allow Access from Anywhere" (0.0.0.0/0)');
      console.error('   5. Click "Confirm"');
      console.error('   6. Wait 1-2 minutes and try again\n');
    } else if (error.message.includes('authentication failed')) {
      console.error('\n   ℹ️  This error means:');
      console.error('   - Your username or password is incorrect');
      console.error('\n   📝 How to fix:');
      console.error('   1. Go to https://cloud.mongodb.com');
      console.error('   2. Click "Database Access" in the left sidebar');
      console.error('   3. Verify your username and password');
      console.error('   4. Update .env file with correct credentials\n');
    }
    
    process.exit(1);
  }
};

testConnection();
