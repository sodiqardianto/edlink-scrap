import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working!' });
});

// Start server
app.listen(PORT, () => {
  console.log('Test server running on port ' + PORT);
  console.log('Health check: http://localhost:' + PORT + '/health');
});