const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    isConnected = true;
  } catch (err) {
    console.error('MongoDB connection error in serverless:', err.message);
  }
}

const server = require('../app');
const app = server.getApp();

module.exports = async (req, res) => {
  await connectDB();
  return app(req, res);
};
