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
    await page.goto('http://localhost:3000/themodernbyte/');
    await page.waitForSelector('h1');
    
    const title = await page.$eval('h1.site-title', el => el.textContent);
    expect(title).toContain('TheModernByte');

    // Step 2: Click NeoBank+ ad
    console.log('Step 2: Click NeoBank+ finance ad');
    await page.click('[data-ad-id="neobank-apy"]');
    
    // Wait for modal to appear and click "I'm Interested"
    await page.waitForSelector('.ad-modal-overlay', { timeout: 10000 });
    await page.waitForSelector('#adActionBtn', { visible: true, timeout: 5000 });
    await page.waitForFunction(() => {
      const btn = document.querySelector('#adActionBtn');
      return btn && btn.offsetParent !== null && !btn.disabled;
    });
    await page.click('#adActionBtn');
    
    // Wait for success toast that zkAffinityAgent creates
    await page.waitForSelector('.success-toast', { timeout: 15000 });
    
    // Verify first attestation
    await verifyAttestation('finance', 'themodernbyte.com', 1);

    // Step 3: Click ClearVPN ad
    console.log('Step 3: Click ClearVPN privacy ad');
    await page.click('[data-ad-id="clearvpn"]');
    
    // Wait for modal and click action button
    await page.waitForSelector('.ad-modal-overlay', { timeout: 10000 });
    await page.waitForSelector('#adActionBtn', { visible: true, timeout: 5000 });
    await page.waitForFunction(() => {
      const btn = document.querySelector('#adActionBtn');
      return btn && btn.offsetParent !== null && !btn.disabled;
    });
    await page.click('#adActionBtn');
    
    // Wait for success toast
    await page.waitForSelector('.success-toast', { timeout: 15000 });
    
    // Verify second attestation
    await verifyAttestation('privacy', 'themodernbyte.com', 2);

    // Step 4: Navigate to smartlivingguide and click Bloom ad
    console.log('Step 4: Navigate to smartlivingguide');
    await page.goto('http://localhost:3000/smartlivingguide/');
    await page.waitForSelector('[data-ad-id="bloom"]');
    
    console.log('Step 5: Click Bloom finance ad');
    await page.click('[data-ad-id="bloom"]');
    
    // Wait for modal and click action button
    await page.waitForSelector('.ad-modal-overlay', { timeout: 10000 });
    await page.waitForSelector('#adActionBtn', { visible: true, timeout: 5000 });
    await page.waitForFunction(() => {
      const btn = document.querySelector('#adActionBtn');
      return btn && btn.offsetParent !== null && !btn.disabled;
    });
    await page.click('#adActionBtn');
    
    // Wait for success toast
    await page.waitForSelector('.success-toast', { timeout: 15000 });
    
    // Verify third attestation
    await verifyAttestation('finance', 'smartlivingguide.com', 3);

    // Step 6: Verify profile aggregation
    const profileStats = await page.evaluate(() => {
      return document.querySelector('#attestationCount')?.textContent || '0';
    });
    expect(parseInt(profileStats)).toBe(3);

    console.log('✅ Complete Finance Nerd Journey test passed');
  }, TEST_CONFIG.timeout);

  test('Cross-Site State Management', async () => {
    console.log('Testing cross-site state management');

    // Navigate to themodernbyte first
    await page.goto('http://localhost:3000/themodernbyte/');
    await page.waitForSelector('h1');

    // Click an ad on themodernbyte
    await page.click('[data-ad-id="neobank-apy"]');
    
    // Wait for modal and click action button
    await page.waitForSelector('.ad-modal-overlay', { timeout: 10000 });
    await page.waitForSelector('#adActionBtn', { visible: true, timeout: 5000 });
    await page.waitForFunction(() => {
      const btn = document.querySelector('#adActionBtn');
      return btn && btn.offsetParent !== null && !btn.disabled;
    });
    await page.click('#adActionBtn');
    
    // Wait for success toast to ensure attestation was created
    await page.waitForSelector('.success-toast', { timeout: 15000 });

    // Navigate to second site and verify state persists
    await page.goto('http://localhost:3000/smartlivingguide/');
    
    // Verify wallet state is maintained
    const walletData = await page.evaluate(() => {
      return localStorage.getItem('zkWallet');
    });
    
    expect(walletData).toBeTruthy();
    const wallet = JSON.parse(walletData);
    expect(wallet.address).toBeTruthy();
    
    console.log('✅ Cross-site state management test completed');
  });

  test('Error Handling - Invalid Ad Click', async () => {
    console.log('Testing error handling for invalid ad clicks');
    
    // Navigate to themodernbyte
    await page.goto('http://localhost:3000/themodernbyte/');
    await page.waitForSelector('h1');
    
    // Try to click a non-existent ad element
    try {
      await page.click('[data-ad-id="non-existent-ad"]', { timeout: 1000 });
    } catch (error) {
      // This should fail as expected
      expect(error.message).toContain('No element found');
    }
    
    console.log('✅ Error handling test completed');
  });

  test('Performance Metrics', async () => {
    console.log('Testing performance metrics');
    
    const startTime = Date.now();
    
    // Navigate to themodernbyte first
    await page.goto('http://localhost:3000/themodernbyte/', { timeout: 30000 });
    await page.waitForSelector('h1');
    
    // Complete a full workflow and measure time
    await page.click('[data-ad-id="neobank-apy"]');
    
    // Wait for modal and click action button
    await page.waitForSelector('.ad-modal-overlay', { timeout: 10000 });
    await page.waitForSelector('#adActionBtn', { visible: true, timeout: 5000 });
    await page.waitForFunction(() => {
      const btn = document.querySelector('#adActionBtn');
      return btn && btn.offsetParent !== null && !btn.disabled;
    });
    await page.click('#adActionBtn');
    
    // Wait for success toast
    await page.waitForSelector('.success-toast', { timeout: 15000 });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`Workflow completed in ${duration}ms`);
    expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
  }, 60000); // Increase timeout to 60 seconds

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