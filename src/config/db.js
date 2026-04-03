// This file handles connecting to our MongoDB database
// We use Mongoose which makes it easier to work with MongoDB in Node.js

const mongoose = require('mongoose');

async function connectDB() {
  try {
    // Connect using the URI from our .env file
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Successfully connected to MongoDB!');
  } catch (error) {
    // If we can't connect to the database, the app is useless, so we stop it
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1); // exit code 1 means something went wrong
  }
}

module.exports = connectDB;