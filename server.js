// This is the main entry point of our backend server
// It connects to MongoDB first, then starts the Express server

// Load environment variables from .env file !!
require('dotenv').config();

const connectDB = require('./src/config/db');
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

// First connect to the database, then start the server!!
// We don't want to accept requests before the DB is ready
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
});