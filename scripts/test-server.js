/**
 * ZooKies Server Test Suite
 * Comprehensive tests for all Express.js server endpoints and functionality
 */

const axios = require('axios');
const { PublisherSigner } = require('../shared/cryptography');
const { PUBLISHER_KEYS } = require('../shared/publisher-keys');
const { ethers } = require('ethers');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TIMEOUT = 10000;

// Create axios instance with timeout
const api = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Test wallet for attestation testing
const testWallet = ethers.Wallet.createRandom();
const testWalletAddress = testWallet.address;

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * Test helper functions
 */
function logTest(testName, success, message = '') {
  const status = success ? '✅ PASS' : '❌ FAIL';
  const timestamp = new Date().toISOString();
  
  console.log(`${status} ${testName} ${message}`);
  
  if (success) {
    testResults.passed++;
  } else {
    testResults.failed++;
    testResults.errors.push(`${testName}: ${message}`);
  }
}

async function createTestAttestation(publisher, tag) {
  try {
    // Create attestation using PublisherSigner
    const publisherKeys = PUBLISHER_KEYS[publisher];
    const signer = new PublisherSigner(publisherKeys.privateKey, publisher);
    
    const attestation = await signer.signAttestation(
      tag,
      testWalletAddress
    );
    
    return attestation;
  } catch (error) {
    console.error(`❌ Failed to create test attestation:`, error.message);
    throw error;
  }
}

/**
 * Test Suite Functions
 */
async function testServerHealth() {
  try {
    console.log('\n🏥 Testing Server Health...');
    
    const response = await api.get('/api/health');
    
    logTest('Health Check Response', response.status === 200);
    logTest('Health Status', response.data.status === 'healthy');
    logTest('Database Status', response.data.database === 'connected');
    logTest('Version Present', !!response.data.version);
    
  } catch (error) {
    logTest('Health Check', false, error.message);
  }
}

async function testBasicRoutes() {
  try {
    console.log('\n🌐 Testing Basic Routes...');
    
    // Test root endpoint
    const rootResponse = await api.get('/');
    logTest('Root Endpoint', rootResponse.status === 200);
    logTest('Root Message', rootResponse.data.message.includes('ZooKies'));
    
    // Test publishers endpoint
    const publishersResponse = await api.get('/api/publishers');
    logTest('Publishers Endpoint', publishersResponse.status === 200);
    logTest('Publishers Count', publishersResponse.data.count === 2);
    logTest('TheModernByte Publisher', !!publishersResponse.data.publishers['themodernbyte.com']);
    logTest('SmartLivingGuide Publisher', !!publishersResponse.data.publishers['smartlivingguide.com']);
    
    // Test 404 handling
    try {
      await api.get('/api/nonexistent');
      logTest('404 Handling', false, 'Should have returned 404');
    } catch (error) {
      logTest('404 Handling', error.response?.status === 404);
    }
    
  } catch (error) {
    logTest('Basic Routes', false, error.message);
  }
}

async function testAttestationStorage() {
  try {
    console.log('\n📝 Testing Attestation Storage...');
    
    // Create test attestation
    const attestation = await createTestAttestation('themodernbyte.com', 'finance');
    
    // Store attestation
    const storeResponse = await api.post('/api/store-attestation', {
      attestation: attestation
    });
    
    logTest('Store Attestation', storeResponse.status === 200);
    logTest('Store Response Success', storeResponse.data.success === true);
    logTest('Attestation ID Returned', !!storeResponse.data.attestationId);
    
    // Test invalid attestation (missing signature)
    try {
      const invalidAttestation = { ...attestation };
      delete invalidAttestation.signature;
      
      await api.post('/api/store-attestation', {
        attestation: invalidAttestation
      });
      
      logTest('Invalid Attestation Handling', false, 'Should have rejected invalid attestation');
    } catch (error) {
      logTest('Invalid Attestation Handling', error.response?.status === 400);
    }
    
    // Test missing attestation data
    try {
      await api.post('/api/store-attestation', {});
      logTest('Missing Attestation Handling', false, 'Should have rejected missing attestation');
    } catch (error) {
      logTest('Missing Attestation Handling', error.response?.status === 400);
    }
    
  } catch (error) {
    logTest('Attestation Storage', false, error.message);
  }
}

async function testProfileManagement() {
  try {
    console.log('\n👤 Testing Profile Management...');
    
    // Create and store multiple attestations for profile testing
    const attestations = [
      await createTestAttestation('themodernbyte.com', 'finance'),
      await createTestAttestation('themodernbyte.com', 'privacy'),
      await createTestAttestation('smartlivingguide.com', 'travel')
    ];
    
    // Store all attestations
    for (const attestation of attestations) {
      await api.post('/api/store-attestation', { attestation });
    }
    
    // Test profile retrieval
    const profileResponse = await api.get(`/api/profile/${testWalletAddress}`);
    
    logTest('Profile Retrieval', profileResponse.status === 200);
    logTest('Profile Wallet Address', profileResponse.data.walletAddress === testWalletAddress);
    logTest('Profile Attestations Count', profileResponse.data.attestations.length >= 3);
    logTest('Profile Statistics', !!profileResponse.data.statistics);
    logTest('Profile Tag Counts', Object.keys(profileResponse.data.statistics.tagCounts).length >= 3);
    
    // Test invalid wallet address
    try {
      await api.get('/api/profile/invalid-wallet');
      logTest('Invalid Wallet Handling', false, 'Should have rejected invalid wallet');
    } catch (error) {
      logTest('Invalid Wallet Handling', error.response?.status === 400);
    }
    
  } catch (error) {
    logTest('Profile Management', false, error.message);
  }
}

async function testProfileReset() {
  try {
    console.log('\n🔄 Testing Profile Reset...');
    
    // Reset profile
    const resetResponse = await api.delete(`/api/reset-profile/${testWalletAddress}`);
    
    logTest('Profile Reset', resetResponse.status === 200);
    logTest('Reset Success', resetResponse.data.success === true);
    logTest('Reset Stats', !!resetResponse.data.deletionStats);
    
    // Verify profile is empty after reset
    const profileResponse = await api.get(`/api/profile/${testWalletAddress}`);
    
    logTest('Profile Empty After Reset', profileResponse.data.attestations.length === 0);
    logTest('Statistics Reset', profileResponse.data.statistics.totalAttestations === 0);
    
  } catch (error) {
    logTest('Profile Reset', false, error.message);
  }
}

async function testStaticFileServing() {
  try {
    console.log('\n📁 Testing Static File Serving...');
    
    // Test publisher site access
    const theModernByteResponse = await api.get('/themodernbyte');
    logTest('TheModernByte Site', theModernByteResponse.status === 200);
    logTest('TheModernByte HTML', theModernByteResponse.data.includes('<html'));
    
    const smartLivingGuideResponse = await api.get('/smartlivingguide');
    logTest('SmartLivingGuide Site', smartLivingGuideResponse.status === 200);
    logTest('SmartLivingGuide HTML', smartLivingGuideResponse.data.includes('<html'));
    
    // Test shared file access
    const sharedResponse = await api.get('/shared/zkAffinityAgent.js');
    logTest('Shared File Access', sharedResponse.status === 200);
    logTest('JavaScript File Content', sharedResponse.data.includes('ZkAffinityAgent'));
    
  } catch (error) {
    logTest('Static File Serving', false, error.message);
  }
}

async function testCorsAndMiddleware() {
  try {
    console.log('\n🔒 Testing CORS and Middleware...');
    
    // Test OPTIONS request (preflight) - CORS middleware returns 204 No Content
    const optionsResponse = await api.options('/api/health');
    logTest('OPTIONS Request', optionsResponse.status === 204);
    
    // Test large payload handling (should work within limits)
    const largeAttestation = await createTestAttestation('themodernbyte.com', 'finance');
    largeAttestation.extraData = 'x'.repeat(1000); // Add some extra data
    
    const largeResponse = await api.post('/api/store-attestation', {
      attestation: largeAttestation
    });
    
    logTest('Large Payload Handling', largeResponse.status === 200);
    
  } catch (error) {
    logTest('CORS and Middleware', false, error.message);
  }
}

/**
 * Main Test Runner
 */
async function runAllTests() {
  console.log('🎯 ZooKies Server Test Suite');
  console.log('='.repeat(50));
  console.log(`Testing server at: ${BASE_URL}`);
  console.log(`Test wallet: ${testWalletAddress}`);
  console.log('='.repeat(50));
  
  try {
    // Wait for server to be ready
    console.log('⏳ Waiting for server to be ready...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Run all test suites
    await testServerHealth();
    await testBasicRoutes();
    await testAttestationStorage();
    await testProfileManagement();
    await testProfileReset();
    await testStaticFileServing();
    await testCorsAndMiddleware();
    
    // Print final results
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Results Summary');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${(testResults.passed / (testResults.passed + testResults.failed) * 100).toFixed(1)}%`);
    
    if (testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      testResults.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('\n' + '='.repeat(50));
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  testServerHealth,
  testBasicRoutes,
  testAttestationStorage,
  testProfileManagement,
  testProfileReset,
  testStaticFileServing,
  testCorsAndMiddleware
}; 