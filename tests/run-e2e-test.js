/**
 * Standalone E2E Test Runner for Finance Nerd Journey
 * Bypasses Jest configuration issues
 */

const puppeteer = require('puppeteer');
const { ethers } = require('ethers');
const { DatabaseManager } = require('../shared/database');
const { PublisherSigner } = require('../shared/cryptography');
const { PUBLISHER_KEYS } = require('../shared/publisher-keys');
const axios = require('axios');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 30000,
  headless: process.env.TEST_HEADLESS !== 'false'
};

// Simple assertion function
function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`);
      }
    },
    toContain: (expected) => {
      if (!actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`);
      }
    },
    toBeLessThan: (expected) => {
      if (actual >= expected) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
    },
    toBeNull: () => {
      if (actual !== null) {
        throw new Error(`Expected ${actual} to be null`);
      }
    }
  };
}

async function runTests() {
  console.log('🚀 Starting ZooKies Finance Nerd Journey E2E Test');
  
  let browser, page, dbManager, testWallet;
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Check if server is running
    console.log('🔍 Checking server status...');
    try {
      const response = await axios.get(`${TEST_CONFIG.baseUrl}/api/health`);
      console.log('✅ Server is running:', response.data);
    } catch (error) {
      throw new Error('Server must be running on port 3000. Run: npm run dev');
    }

    // Initialize database manager
    console.log('🗄️ Initializing database...');
    dbManager = new DatabaseManager();
    await dbManager.initializeDatabase();

    // Create test wallet with fixed private key for consistency
    testWallet = new ethers.Wallet(
      '0x1234567890123456789012345678901234567890123456789012345678901234'
    );
    console.log(`👛 Test wallet: ${testWallet.address}`);

    // Test 1: Complete Finance Nerd Journey
    await runCompleteJourneyTest();
    testsPassed++;

    // Test 2: Cross-Site State Management  
    await runCrossSiteTest();
    testsPassed++;

    // Test 3: Performance Test
    await runPerformanceTest();
    testsPassed++;

    console.log(`\n🎉 All tests completed! ✅ ${testsPassed} passed, ❌ ${testsFailed} failed`);

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    testsFailed++;
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
    if (dbManager) await dbManager.close();
  }

  process.exit(testsFailed > 0 ? 1 : 0);

  async function setupBrowser() {
    // Clean up test data
    await dbManager.resetUserProfile(testWallet.address);

    // Launch browser
    browser = await puppeteer.launch({ 
      headless: TEST_CONFIG.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Set up test wallet in localStorage
    await page.evaluateOnNewDocument((walletAddress, privateKey) => {
      localStorage.setItem('zkAffinity_walletAddress', walletAddress);
      localStorage.setItem('zkAffinity_privateKey', privateKey);
    }, testWallet.address, testWallet.privateKey);

    // Set up console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Browser console error: ${msg.text()}`);
      }
    });
  }

  async function runCompleteJourneyTest() {
    console.log('\n📝 Test 1: Complete Finance Nerd Journey');
    
    await setupBrowser();

    // Step 1: Navigate to themodernbyte
    console.log('  Step 1: Navigate to themodernbyte');
    await page.goto(`${TEST_CONFIG.baseUrl}/themodernbyte`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('h1');
    
    const title = await page.$eval('h1', el => el.textContent);
    expect(title).toContain('TheModernByte');

    // Step 2: Click NeoBank+ ad
    console.log('  Step 2: Click NeoBank+ finance ad');
    await page.waitForSelector('[data-ad-id="neobank-apy"]');
    await page.click('[data-ad-id="neobank-apy"]');
    await page.waitForSelector('.ad-modal-overlay');
    
    // Wait a bit for modal content to fully render
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    const modalTitle = await page.$eval('#adModalTitle', el => el.textContent);
    expect(modalTitle).toContain('NeoBank+');
    
    await page.click('#adActionBtn');
    await page.waitForSelector('.success-message, .message.success');
    await page.waitForSelector('.ad-modal-overlay', { hidden: true });

    // Verify first attestation
    await verifyAttestation('finance', 'themodernbyte.com', 1);

    // Step 3: Click ClearVPN ad
    console.log('  Step 3: Click ClearVPN privacy ad');
    await page.click('[data-ad-id="clearvpn"]');
    await page.waitForSelector('.ad-modal-overlay');
    await page.click('#adActionBtn');
    await page.waitForSelector('.success-message, .message.success');
    await page.waitForSelector('.ad-modal-overlay', { hidden: true });

    await verifyAttestation('privacy', 'themodernbyte.com', 2);

    // Step 4: Navigate to smartlivingguide
    console.log('  Step 4: Navigate to smartlivingguide');
    await page.goto(`${TEST_CONFIG.baseUrl}/smartlivingguide`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('h1');
    
    const smartTitle = await page.$eval('h1', el => el.textContent);
    expect(smartTitle).toContain('Smart Living Guide');

    // Step 5: Click Bloom ad
    console.log('  Step 5: Click Bloom debit card finance ad');
    await page.click('[data-ad-id="bloom"]');
    await page.waitForSelector('.ad-modal-overlay');
    await page.click('#adActionBtn');
    await page.waitForSelector('.success-message, .message.success');
    await page.waitForSelector('.ad-modal-overlay', { hidden: true });

    await verifyAttestation('finance', 'smartlivingguide.com', 3);

    // Step 6: Verify profile aggregation
    console.log('  Step 6: Verify profile aggregation');
    await page.click('.profile-viewer .btn-refresh');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const attestationCount = await page.$eval('#attestationCount', el => el.textContent);
    expect(attestationCount).toBe('3');

    await verifyCompleteProfile();

    console.log('  ✅ Complete Finance Nerd Journey test passed!');
  }

  async function runCrossSiteTest() {
    console.log('\n🔄 Test 2: Cross-Site State Management');
    
    await setupBrowser();
    
    // Click an ad on the first site
    await page.goto(`${TEST_CONFIG.baseUrl}/themodernbyte`, { waitUntil: 'networkidle2' });
    await page.click('[data-ad-id="neobank-apy"]');
    await page.waitForSelector('.ad-modal-overlay');
    await page.click('#adActionBtn');
    await page.waitForSelector('.ad-modal-overlay', { hidden: true });

    // Navigate to second site and verify state persists
    await page.goto(`${TEST_CONFIG.baseUrl}/smartlivingguide`, { waitUntil: 'networkidle2' });

    const walletAddress = await page.evaluate(() => {
      return localStorage.getItem('zkAffinity_walletAddress');
    });
    
    expect(walletAddress).toBe(testWallet.address);
    console.log('  ✅ Cross-site state management test passed!');
  }

  async function runPerformanceTest() {
    console.log('\n⚡ Test 3: Performance Metrics');
    
    await setupBrowser();
    
    const startTime = Date.now();
    
    await page.goto(`${TEST_CONFIG.baseUrl}/themodernbyte`, { waitUntil: 'networkidle2' });
    await page.click('[data-ad-id="neobank-apy"]');
    await page.waitForSelector('.ad-modal-overlay');
    await page.click('#adActionBtn');
    await page.waitForSelector('.ad-modal-overlay', { hidden: true });
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    expect(executionTime).toBeLessThan(15000);
    
    console.log(`  ✅ Performance test passed in ${executionTime}ms!`);
  }

  async function verifyAttestation(expectedTag, expectedPublisher, expectedCount) {
    // Add a small delay to ensure database transaction is committed
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const attestations = await dbManager.getAllAttestations(testWallet.address);
    
    expect(attestations.length).toBe(expectedCount);

    const latest = attestations[0]; // Array is in descending order, first element is newest
    expect(latest.tag).toBe(expectedTag);
    expect(latest.publisher).toBe(expectedPublisher);
    expect(latest.user_wallet).toBe(testWallet.address);

    const publisherKeys = PUBLISHER_KEYS[expectedPublisher];
    const isValid = PublisherSigner.verifyAttestation(latest, publisherKeys.publicKey);
    expect(isValid).toBe(true);

    console.log(`    ✅ Attestation ${expectedCount} verified: ${expectedTag} from ${expectedPublisher}`);
  }

  async function verifyCompleteProfile() {
    const attestations = await dbManager.getAllAttestations(testWallet.address);
    
    expect(attestations.length).toBe(3);
    
    const tagCounts = attestations.reduce((acc, att) => {
      acc[att.tag] = (acc[att.tag] || 0) + 1;
      return acc;
    }, {});
    
    expect(tagCounts.finance).toBe(2);
    expect(tagCounts.privacy).toBe(1);
    
    const publishers = new Set(attestations.map(att => att.publisher));
    expect(publishers.size).toBe(2);
    
    for (const attestation of attestations) {
      const publisherKeys = PUBLISHER_KEYS[attestation.publisher];
      const isValid = PublisherSigner.verifyAttestation(attestation, publisherKeys.publicKey);
      expect(isValid).toBe(true);
    }
    
    console.log('    ✅ Complete profile verification successful');
  }
}

// Run the tests
runTests().catch(console.error); 