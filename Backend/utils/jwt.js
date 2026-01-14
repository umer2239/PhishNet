const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (userId, email, expiresIn = '7d') => {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET || 'your_jwt_secret_key_here', {
    expiresIn,
  });
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
  } catch (error) {
    return null;
  }
};

// Decode token without verification
const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
};
