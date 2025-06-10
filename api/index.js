// Serverless entry point for Vercel
const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables based on NODE_ENV
const envPath = process.env.NODE_ENV 
  ? path.resolve(process.cwd(), `../backend/.env.${process.env.NODE_ENV}`) 
  : path.resolve(process.cwd(), '../backend/.env');

dotenv.config({ path: envPath });

// Import backend code
const backendApp = require('../backend/index');

// Create Express app for Vercel
const app = express();

// Use CORS
app.use(cors());

// Use the backend application
app.use('/api', backendApp);

// Handle non-API routes by sending to frontend
app.use('*', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// Export for Vercel serverless
module.exports = app;
