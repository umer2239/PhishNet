const mongoose = require('mongoose');

// Database connection configuration for MongoDB Atlas
const connectDB = async () => {
  try {
    // Get MongoDB URI from environment variables
    const mongoURI =
      process.env.MONGODB_URI ||
      'mongodb+srv://username:password@cluster.mongodb.net/phishnet?retryWrites=true&w=majority';

    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(
      `✓ MongoDB Connected: ${conn.connection.host} | Database: ${conn.connection.name}`
    );

    return conn;
  } catch (error) {
    console.error(`✗ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// Graceful shutdown
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('✓ MongoDB Disconnected');
  } catch (error) {
    console.error(`✗ MongoDB Disconnection Error: ${error.message}`);
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠ MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('⚠ MongoDB connection error:', error);
});

module.exports = {
  connectDB,
  disconnectDB,
};
