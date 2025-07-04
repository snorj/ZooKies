/**
 * ZooKies Express.js Server
 * Comprehensive server with static file serving, API endpoints, signature verification,
 * and database operations for attestation storage and profile management
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Import custom modules
const { DatabaseManager, DatabaseError, ValidationError } = require('./shared/database');
const { PublisherSigner, SignatureVerificationError } = require('./shared/cryptography');
const { PUBLISHER_KEYS } = require('./shared/publisher-keys');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database manager
let dbManager;

/**
 * Middleware Setup
 */
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080',
    'http://127.0.0.1:8080'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} ${req.method} ${req.url}`);
  next();
});

/**
 * Static File Serving Configuration
 */
app.use('/themodernbyte', express.static(path.join(__dirname, 'themodernbyte')));
app.use('/smartlivingguide', express.static(path.join(__dirname, 'smartlivingguide')));
app.use('/shared', express.static(path.join(__dirname, 'shared')));

/**
 * Basic Routes
 */
app.get('/', (req, res) => {
  res.json({
    message: 'ZooKies Privacy-First Advertising Platform API',
    version: '1.1.0',
    status: 'running',
    endpoints: {
      publishers: {
        themodernbyte: '/themodernbyte',
        smartlivingguide: '/smartlivingguide'
      },
      api: {
        health: '/api/health',
        storeAttestation: 'POST /api/store-attestation',
        getProfile: 'GET /api/profile/:wallet',
        resetProfile: 'DELETE /api/reset-profile/:wallet'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Publisher site routes
app.get('/themodernbyte', (req, res) => {
  res.sendFile(path.join(__dirname, 'themodernbyte', 'index.html'));
});

app.get('/smartlivingguide', (req, res) => {
  res.sendFile(path.join(__dirname, 'smartlivingguide', 'index.html'));
});

/**
 * API Health Check
 */
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const dbStatus = dbManager ? 'connected' : 'not initialized';
    
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      database: dbStatus,
      version: '1.1.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Store Attestation Endpoint
 * POST /api/store-attestation
 * Validates signature, verifies attestation structure, stores in database
 */
app.post('/api/store-attestation', async (req, res) => {
  try {
    console.log('📝 Attestation storage request received');
    
    // Extract and validate request body
    const { attestation } = req.body;
    
    if (!attestation) {
      return res.status(400).json({ 
        error: 'Missing attestation data',
        code: 'MISSING_ATTESTATION'
      });
    }

    // Validate required attestation fields
    const requiredFields = ['tag', 'timestamp', 'nonce', 'signature', 'publisher', 'user_wallet'];
    for (const field of requiredFields) {
      if (!attestation[field]) {
        return res.status(400).json({ 
          error: `Missing required field: ${field}`,
          code: 'MISSING_FIELD',
          field
        });
      }
    }

    // Validate publisher
    if (!PUBLISHER_KEYS[attestation.publisher]) {
      return res.status(400).json({ 
        error: `Invalid publisher: ${attestation.publisher}`,
        code: 'INVALID_PUBLISHER'
      });
    }

    // Verify signature using cryptography module
    const publisherKeys = PUBLISHER_KEYS[attestation.publisher];
    
    // Use static verification method
    const isValid = PublisherSigner.verifyAttestation(attestation, publisherKeys.publicKey);
    
    if (!isValid) {
      return res.status(400).json({ 
        error: 'Invalid attestation signature',
        code: 'INVALID_SIGNATURE'
      });
    }

    console.log('✅ Attestation signature verified');

    // Store in database using enhanced verification method
    const attestationId = await dbManager.verifyAndStoreAttestation(attestation);
    
    console.log(`✅ Attestation stored with ID: ${attestationId}`);

    res.json({ 
      success: true,
      attestationId,
      message: 'Attestation stored successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Attestation storage failed:', error.message);

    if (error instanceof ValidationError) {
      return res.status(400).json({
        error: error.message,
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    if (error instanceof SignatureVerificationError) {
      return res.status(400).json({
        error: 'Signature verification failed',
        code: 'SIGNATURE_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({ 
      error: 'Internal server error during attestation storage',
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Storage failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get User Profile Endpoint
 * GET /api/profile/:wallet
 * Retrieves user profile with all attestations for wallet address
 */
app.get('/api/profile/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;
    
    console.log(`👤 Profile request for wallet: ${wallet}`);

    // Validate wallet address format
    if (!wallet || !wallet.startsWith('0x') || wallet.length !== 42) {
      return res.status(400).json({ 
        error: 'Invalid wallet address format',
        code: 'INVALID_WALLET',
        expected: '0x followed by 40 hexadecimal characters'
      });
    }

    // Get user profile from database
    const profile = await dbManager.getUserProfile(wallet);
    
    // Get all attestations for the wallet
    const attestations = await dbManager.getAllAttestations(wallet);

    // Calculate profile statistics
    const tagCounts = {};
    const publishers = new Set();
    
    attestations.forEach(attestation => {
      tagCounts[attestation.tag] = (tagCounts[attestation.tag] || 0) + 1;
      publishers.add(attestation.publisher);
    });

    const profileData = {
      walletAddress: wallet,
      profile: profile || null,
      attestations: attestations,
      statistics: {
        totalAttestations: attestations.length,
        tagCounts,
        publishers: Array.from(publishers),
        firstAttestation: attestations.length > 0 ? attestations[0].created_at : null,
        lastAttestation: attestations.length > 0 ? attestations[attestations.length - 1].created_at : null
      },
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Profile retrieved: ${attestations.length} attestations`);

    res.json(profileData);

  } catch (error) {
    console.error('❌ Profile retrieval failed:', error.message);

    if (error instanceof ValidationError) {
      return res.status(400).json({
        error: error.message,
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({ 
      error: 'Internal server error during profile retrieval',
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Retrieval failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Reset User Profile Endpoint
 * DELETE /api/reset-profile/:wallet
 * Removes all attestations and profile data for wallet address
 */
app.delete('/api/reset-profile/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;
    
    console.log(`🔄 Profile reset request for wallet: ${wallet}`);

    // Validate wallet address format
    if (!wallet || !wallet.startsWith('0x') || wallet.length !== 42) {
      return res.status(400).json({ 
        error: 'Invalid wallet address format',
        code: 'INVALID_WALLET',
        expected: '0x followed by 40 hexadecimal characters'
      });
    }

    // Reset user profile in database
    const resetResult = await dbManager.resetUserProfile(wallet);

    console.log(`✅ Profile reset completed:`, resetResult);

    res.json({ 
      success: true,
      walletAddress: wallet,
      deletionStats: resetResult,
      message: 'Profile reset successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Profile reset failed:', error.message);

    if (error instanceof ValidationError) {
      return res.status(400).json({
        error: error.message,
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({ 
      error: 'Internal server error during profile reset',
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Reset failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get Publisher Information
 * GET /api/publishers
 * Returns available publishers and their public keys
 */
app.get('/api/publishers', (req, res) => {
  try {
    const publisherInfo = {};
    
    Object.keys(PUBLISHER_KEYS).forEach(domain => {
      publisherInfo[domain] = {
        domain,
        publicKey: PUBLISHER_KEYS[domain].publicKey,
        // Don't expose private keys
        hasPrivateKey: !!PUBLISHER_KEYS[domain].privateKey
      };
    });

    res.json({
      publishers: publisherInfo,
      count: Object.keys(publisherInfo).length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Publisher info retrieval failed:', error.message);
    res.status(500).json({ 
      error: 'Failed to retrieve publisher information',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Error Handling Middleware
 */
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.stack);
  
  res.status(500).json({ 
    error: 'Something went wrong!',
    code: 'UNHANDLED_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

/**
 * 404 Handler
 */
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

/**
 * Database Initialization and Server Startup
 */
async function initializeServer() {
  try {
    console.log('🗃️ Initializing database connection...');
    
    // Initialize database manager
    dbManager = new DatabaseManager();
    await dbManager.initializeDatabase();
    
    console.log('✅ Database initialized successfully');

    // Start server
    const server = app.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log('🎯 ZooKies Privacy-First Advertising Platform');
      console.log('='.repeat(60));
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 TheModernByte: http://localhost:${PORT}/themodernbyte`);
      console.log(`🏠 SmartLivingGuide: http://localhost:${PORT}/smartlivingguide`);
      console.log(`🔧 API Health: http://localhost:${PORT}/api/health`);
      console.log(`📊 Publishers: http://localhost:${PORT}/api/publishers`);
      console.log('='.repeat(60));
      console.log('✅ Server ready for attestation processing');
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      console.log('🔄 SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('\n🔄 SIGINT received, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Server initialization failed:', error.message);
    process.exit(1);
  }
}

// Initialize and start server
initializeServer();

module.exports = app; 