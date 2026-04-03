// This file sets up our Express application
// We configure middleware and connect all our routes here

const express = require('express');
const cors = require('cors');

// Import all route files
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const recordRoutes = require('./routes/records');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// --- Middleware setup ---
// cors() allows our frontend (on a different port) to talk to this backend
app.use(cors());

// These two lines allow us to read JSON and form data from requests
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// --- Health check route ---
// A simple route to confirm the server is running
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Finance Dashboard API is running!',
    time: new Date()
  });
});

// --- All our API routes ---
app.use('/api/auth', authRoutes);       // login, register, logout
app.use('/api/users', userRoutes);      // user management (admin only)
app.use('/api/records', recordRoutes);  // financial records CRUD
app.use('/api/dashboard', dashboardRoutes); // summary and analytics

// --- Handle unknown routes ---
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Oops! Route ${req.originalUrl} does not exist`
  });
});

// --- Global error handler ---
// If any route throws an error, this catches it and returns a clean response
app.use((err, req, res, next) => {
  console.error('Something broke:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Something went wrong on the server'
  });
});

module.exports = app;
