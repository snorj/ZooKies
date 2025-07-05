/**
 * Finance Nerd User Journey End-to-End Test
 * Tests the complete user journey across both publisher sites
 */

const puppeteer = require('puppeteer');
const { ethers } = require('ethers');
const { DatabaseManager } = require('../shared/database');
const { PublisherSigner } = require('../shared/cryptography');
const { PUBLISHER_KEYS } = require('../shared/publisher-keys');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 30000,
  headless: process.env.TEST_HEADLESS !== 'false'
};

describe('Finance Nerd User Journey', () => {
  let browser, page, dbManager, testWallet;

  beforeAll(async () => {
    // Check if server is running
    const axios = require('axios');
    try {
      await axios.get(`${TEST_CONFIG.baseUrl}/api/health`);
      console.log('✅ Server is running');
    } catch (error) {
      throw new Error('Server must be running on port 3000. Run: npm run dev');
    }

    // Initialize database manager
    dbManager = new DatabaseManager();
    await dbManager.initializeDatabase();

    // Create test wallet with fixed private key for consistency
    testWallet = new ethers.Wallet(
      '0x1234567890123456789012345678901234567890123456789012345678901234'
    );
    console.log(`Test wallet: ${testWallet.address}`);
  });

  beforeEach(async () => {
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
    await page.evaluateOnNewDocument((walletAddress) => {
      localStorage.setItem('zkAffinity_walletAddress', walletAddress);
    }, testWallet.address);

    // Set up console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Browser console error: ${msg.text()}`);
      }
    });
  });

  afterEach(async () => {
    if (page) await page.close();
    if (browser) await browser.close();
  });

  afterAll(async () => {
    if (dbManager) await dbManager.close();
  });

  test('Complete Finance Nerd Journey', async () => {
    console.log('Starting Finance Nerd Journey Test');

    // Step 1: Navigate to themodernbyte
    console.log('Step 1: Navigate to themodernbyte');
    await page.goto(`${TEST_CONFIG.baseUrl}/themodernbyte`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('h1');
    
    const title = await page.$eval('h1', el => el.textContent);
    expect(title).toContain('TheModernByte');

    // Step 2: Click NeoBank+ ad
    console.log('Step 2: Click NeoBank+ finance ad');
    await page.waitForSelector('[data-ad-id="neobank-apy"]');
    await page.click('[data-ad-id="neobank-apy"]');
    await page.waitForSelector('.ad-modal-overlay');
    
    // Verify modal content
    const modalTitle = await page.$eval('#adModalTitle', el => el.textContent);
    expect(modalTitle).toContain('NeoBank+');
    
    // Click the primary action button instead of looking for confirm
    await page.click('#adActionBtn');
    await page.waitForSelector('.success-message, .message.success');
    await page.waitForSelector('.ad-modal-overlay', { hidden: true });

    // Verify first attestation
    await verifyAttestation('finance', 'themodernbyte.com', 1);

    // Step 3: Click ClearVPN ad
    console.log('Step 3: Click ClearVPN privacy ad');
    await page.click('[data-ad-id="clearvpn"]');
    await page.waitForSelector('.ad-modal-overlay');
    await page.click('#adActionBtn');
    await page.waitForSelector('.success-message, .message.success');
    await page.waitForSelector('.ad-modal-overlay', { hidden: true });

    // Verify second attestation
    await verifyAttestation('privacy', 'themodernbyte.com', 2);

    // Step 4: Navigate to smartlivingguide
    console.log('Step 4: Navigate to smartlivingguide');
    await page.goto(`${TEST_CONFIG.baseUrl}/smartlivingguide`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('h1');
    
    const smartTitle = await page.$eval('h1', el => el.textContent);
    expect(smartTitle).toContain('Smart Living Guide');

    // Step 5: Click Bloom ad (corrected from bloom-debit to bloom)
    console.log('Step 5: Click Bloom debit card finance ad');
    await page.click('[data-ad-id="bloom"]');
    await page.waitForSelector('.ad-modal-overlay');
    await page.click('#adActionBtn');
    await page.waitForSelector('.success-message, .message.success');
    await page.waitForSelector('.ad-modal-overlay', { hidden: true });

    // Verify third attestation
    await verifyAttestation('finance', 'smartlivingguide.com', 3);

    // Step 6: Verify profile aggregation
    console.log('Step 6: Verify profile aggregation');
    // Use the correct profile viewer button selector
    await page.click('.profile-viewer .btn-refresh');
    await page.waitForTimeout(1000);

    // Check profile viewer content
    const profileContent = await page.$eval('.profile-viewer', el => el.textContent);
    expect(profileContent).toContain('3');
    
    // Check individual profile elements
    const attestationCount = await page.$eval('#attestationCount', el => el.textContent);
    expect(attestationCount).toBe('3');

    // Final comprehensive verification
    await verifyCompleteProfile();

    console.log('✅ Finance Nerd Journey Test Completed Successfully!');
  }, TEST_CONFIG.timeout);

  test('Cross-Site State Management', async () => {
    console.log('Testing cross-site state management');
    
    // Click an ad on the first site
    await page.goto(`${TEST_CONFIG.baseUrl}/themodernbyte`, { waitUntil: 'networkidle2' });
    await page.click('[data-ad-id="neobank-apy"]');
    await page.waitForSelector('.ad-modal-overlay');
    await page.click('#adActionBtn');
    await page.waitForSelector('.ad-modal-overlay', { hidden: true });

    // Navigate to second site and verify state persists
    await page.goto(`${TEST_CONFIG.baseUrl}/smartlivingguide`, { waitUntil: 'networkidle2' });

    // Check that wallet address persists in localStorage
    const walletAddress = await page.evaluate(() => {
      return localStorage.getItem('zkAffinity_walletAddress');
    });
    
    expect(walletAddress).toBe(testWallet.address);
    console.log('✅ Cross-site state management verified');
  });

  test('Error Handling - Invalid Ad Click', async () => {
    console.log('Testing error handling for invalid ad clicks');
    
    await page.goto(`${TEST_CONFIG.baseUrl}/themodernbyte`, { waitUntil: 'networkidle2' });

    // Try to click a non-existent ad
    const nonExistentAd = await page.$('[data-ad-id="non-existent"]');
    expect(nonExistentAd).toBeNull();

    console.log('✅ Error handling test completed');
  });

  test('Performance Metrics', async () => {
    console.log('Testing performance metrics');
    
    const startTime = Date.now();
    
    // Execute simplified journey
    await page.goto(`${TEST_CONFIG.baseUrl}/themodernbyte`, { waitUntil: 'networkidle2' });
    await page.click('[data-ad-id="neobank-apy"]');
    await page.waitForSelector('.ad-modal-overlay');
    await page.click('#adActionBtn');
    await page.waitForSelector('.ad-modal-overlay', { hidden: true });
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    // Verify execution time is reasonable (< 15 seconds)
    expect(executionTime).toBeLessThan(15000);
    
    console.log(`✅ Performance test completed in ${executionTime}ms`);
  });

  /**
   * Verify attestation in database
   */
  async function verifyAttestation(expectedTag, expectedPublisher, expectedCount) {
    const attestations = await dbManager.getAllAttestations(testWallet.address);
    
    // Verify total count
    expect(attestations.length).toBe(expectedCount);

    // Verify latest attestation
    const latest = attestations[attestations.length - 1];
    expect(latest.tag).toBe(expectedTag);
    expect(latest.publisher).toBe(expectedPublisher);
    expect(latest.user_wallet).toBe(testWallet.address);

    // Verify signature
    const publisherKeys = PUBLISHER_KEYS[expectedPublisher];
    const isValid = PublisherSigner.verifyAttestation(latest, publisherKeys.publicKey);
    expect(isValid).toBe(true);

    console.log(`✅ Attestation ${expectedCount} verified: ${expectedTag} from ${expectedPublisher}`);
  }

  /**
   * Verify complete profile aggregation
   */
  async function verifyCompleteProfile() {
    const attestations = await dbManager.getAllAttestations(testWallet.address);
    
    // Verify total count
    expect(attestations.length).toBe(3);
    
    // Verify tag distribution
    const tagCounts = attestations.reduce((acc, att) => {
      acc[att.tag] = (acc[att.tag] || 0) + 1;
      return acc;
    }, {});
    
    expect(tagCounts.finance).toBe(2);
    expect(tagCounts.privacy).toBe(1);
    
    // Verify publisher diversity
    const publishers = new Set(attestations.map(att => att.publisher));
    expect(publishers.size).toBe(2);
    expect(publishers.has('themodernbyte.com')).toBe(true);
    expect(publishers.has('smartlivingguide.com')).toBe(true);
    
    // Verify all signatures
    for (const attestation of attestations) {
      const publisherKeys = PUBLISHER_KEYS[attestation.publisher];
      const isValid = PublisherSigner.verifyAttestation(attestation, publisherKeys.publicKey);
      expect(isValid).toBe(true);
    }
    
    // Verify wallet consistency
    for (const attestation of attestations) {
      expect(attestation.user_wallet).toBe(testWallet.address);
    }
    
    console.log('✅ Complete profile verification successful');
  }
}); 