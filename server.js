const express = require('express');
const cors = require('cors');
const path = require('path');

// Import custom modules (will be implemented in later tasks)
// const DatabaseManager = require('./shared/database');
// const PublisherSigner = require('./shared/cryptography');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for both publisher sites
app.use('/themodernbyte', express.static(path.join(__dirname, 'themodernbyte')));
app.use('/smartlivingguide', express.static(path.join(__dirname, 'smartlivingguide')));
app.use('/shared', express.static(path.join(__dirname, 'shared')));

// Basic routes
app.get('/', (req, res) => {
  res.json({
    message: 'ZooKies API Server',
    version: '1.0.0',
    status: 'running'
  });
});

// Publisher site routes
app.get('/themodernbyte', (req, res) => {
  res.sendFile(path.join(__dirname, 'themodernbyte', 'index.html'));
});

app.get('/smartlivingguide', (req, res) => {
  res.sendFile(path.join(__dirname, 'smartlivingguide', 'index.html'));
});

// API routes (placeholders for future implementation)
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// TODO: Add ZooKies API endpoints in future tasks
// app.post('/api/attestations', handleAttestationSubmission);
// app.get('/api/profiles/:wallet', getUserProfile);
// app.post('/api/ad-clicks', handleAdClick);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ZooKies server running on port ${PORT}`);
  console.log(`📱 TheModernByte: http://localhost:${PORT}/themodernbyte`);
  console.log(`🏠 SmartLivingGuide: http://localhost:${PORT}/smartlivingguide`);
  console.log(`🔧 API Health: http://localhost:${PORT}/api/health`);
});

module.exports = app; 