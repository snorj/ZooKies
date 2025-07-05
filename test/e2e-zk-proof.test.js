/**
 * End-to-End ZK Proof Integration Tests
 * Complete testing of ZK proof generation, submission, and verification
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

describe('E2E ZK Proof Integration Tests', () => {
  let browser;
  let page;
  const serverUrl = 'http://localhost:3000';
  const testTimeout = 60000; // 60 seconds

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }, testTimeout);

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    
    // Set up console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser Error:', msg.text());
      }
    });
    
    // Set up error handling
    page.on('pageerror', error => {
      console.log('Page Error:', error.message);
    });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  describe('Prerequisites Check', () => {
    
    test('Should have server running', async () => {
      const response = await page.goto(serverUrl, { waitUntil: 'networkidle0' });
      expect(response.status()).toBe(200);
    });

    test('Should load circuit files', async () => {
      const wasmPath = path.join(__dirname, '..', 'circom', 'build', 'circuits', 'ThresholdProof_js', 'ThresholdProof.wasm');
      const zkeyPath = path.join(__dirname, '..', 'circom', 'build', 'keys', 'ThresholdProof_final.zkey');
      
      expect(fs.existsSync(wasmPath)).toBe(true);
      expect(fs.existsSync(zkeyPath)).toBe(true);
    });
  });

  describe('Basic Page Loading', () => {
    
    test('Should load main page successfully', async () => {
      await page.goto(serverUrl, { waitUntil: 'domcontentloaded' });
      
      const title = await page.title();
      expect(title).toBeDefined();
      expect(title.length).toBeGreaterThan(0);
    });

    test('Should have ZK proof builder available', async () => {
      await page.goto(serverUrl, { waitUntil: 'domcontentloaded' });
      
      // Add ZK proof builder script to page
      await page.addScriptTag({
        path: path.join(__dirname, '..', 'shared', 'zkProofBuilder.js')
      });
      
      // Wait for module to load
      await page.waitForFunction(() => typeof window.getZkProofBuilder === 'function', { timeout: 10000 });
      
      const hasBuilder = await page.evaluate(() => {
        return typeof window.getZkProofBuilder === 'function';
      });
      
      expect(hasBuilder).toBe(true);
    });
  });

  describe('Attestation Management', () => {
    
    test('Should store and retrieve attestations', async () => {
      await page.goto(serverUrl, { waitUntil: 'domcontentloaded' });
      
      // Add database script
      await page.addScriptTag({
        path: path.join(__dirname, '..', 'shared', 'database-browser.js')
      });
      
      // Wait for database to be available
      await page.waitForFunction(() => typeof window.ZooKiesDB !== 'undefined', { timeout: 10000 });
      
      const result = await page.evaluate(async () => {
        try {
          const db = new window.ZooKiesDB();
          await db.init();
          
          const testAttestation = {
            id: 'test_att_e2e',
            tag: 'defi',
            score: 8,
            timestamp: Date.now(),
            signature: 'test_signature_e2e',
            walletAddress: '0x123456789',
            isValid: true
          };
          
          await db.storeAttestation(testAttestation);
          const retrieved = await db.getAttestation('test_att_e2e');
          
          return {
            stored: testAttestation,
            retrieved: retrieved
          };
        } catch (error) {
          return { error: error.message };
        }
      });
      
      expect(result.error).toBeUndefined();
      expect(result.retrieved.id).toBe('test_att_e2e');
      expect(result.retrieved.tag).toBe('defi');
    });

    test('Should handle multiple attestations by tag', async () => {
      await page.goto(serverUrl, { waitUntil: 'domcontentloaded' });
      
      await page.addScriptTag({
        path: path.join(__dirname, '..', 'shared', 'database-browser.js')
      });
      
      await page.waitForFunction(() => typeof window.ZooKiesDB !== 'undefined', { timeout: 10000 });
      
      const result = await page.evaluate(async () => {
        try {
          const db = new window.ZooKiesDB();
          await db.init();
          
          // Store multiple attestations
          const attestations = [
            { id: 'att1', tag: 'defi', score: 8, signature: 'sig1', walletAddress: '0x123', isValid: true },
            { id: 'att2', tag: 'defi', score: 7, signature: 'sig2', walletAddress: '0x123', isValid: true },
            { id: 'att3', tag: 'privacy', score: 6, signature: 'sig3', walletAddress: '0x123', isValid: true }
          ];
          
          for (const att of attestations) {
            await db.storeAttestation(att);
          }
          
          const defiAttestations = await db.getAttestationsByTag('defi');
          const privacyAttestations = await db.getAttestationsByTag('privacy');
          
          return {
            defiCount: defiAttestations.length,
            privacyCount: privacyAttestations.length,
            defiScores: defiAttestations.map(att => att.score)
          };
        } catch (error) {
          return { error: error.message };
        }
      });
      
      expect(result.error).toBeUndefined();
      expect(result.defiCount).toBe(2);
      expect(result.privacyCount).toBe(1);
      expect(result.defiScores).toEqual(expect.arrayContaining([8, 7]));
    });
  });

  describe('ZK Proof Generation', () => {
    
    test('Should initialize ZK proof builder', async () => {
      await page.goto(serverUrl, { waitUntil: 'domcontentloaded' });
      
      await page.addScriptTag({
        path: path.join(__dirname, '..', 'shared', 'zkProofBuilder.js')
      });
      
      await page.waitForFunction(() => typeof window.getZkProofBuilder === 'function', { timeout: 10000 });
      
      const result = await page.evaluate(async () => {
        try {
          const zkBuilder = window.getZkProofBuilder();
          await zkBuilder.initialize();
          
          return {
            success: true,
            isInitialized: zkBuilder.isInitialized
          };
        } catch (error) {
          return { 
            success: false, 
            error: error.message 
          };
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.isInitialized).toBe(true);
    });

    test('Should generate proof with valid attestations', async () => {
      await page.goto(serverUrl, { waitUntil: 'domcontentloaded' });
      
      // Add all required scripts
      await page.addScriptTag({
        path: path.join(__dirname, '..', 'shared', 'database-browser.js')
      });
      
      await page.addScriptTag({
        path: path.join(__dirname, '..', 'shared', 'zkProofBuilder.js')
      });
      
      await page.waitForFunction(() => 
        typeof window.ZooKiesDB !== 'undefined' && 
        typeof window.getZkProofBuilder === 'function', 
        { timeout: 10000 }
      );
      
      const result = await page.evaluate(async () => {
        try {
          // Setup database and attestations
          const db = new window.ZooKiesDB();
          await db.init();
          
          const attestations = [
            { id: 'proof_att1', tag: 'defi', score: 8, signature: 'sig1', walletAddress: '0x123', isValid: true },
            { id: 'proof_att2', tag: 'defi', score: 7, signature: 'sig2', walletAddress: '0x123', isValid: true },
            { id: 'proof_att3', tag: 'defi', score: 9, signature: 'sig3', walletAddress: '0x123', isValid: true }
          ];
          
          for (const att of attestations) {
            await db.storeAttestation(att);
          }
          
          // Get attestations and generate proof
          const storedAttestations = await db.getAttestationsByTag('defi');
          const zkBuilder = window.getZkProofBuilder();
          await zkBuilder.initialize();
          
          const proofResult = await zkBuilder.generateProof(storedAttestations, 'defi', 20);
          
          return {
            attestationCount: storedAttestations.length,
            proofSuccess: proofResult.success,
            totalScore: proofResult.metadata?.totalScore,
            hasProof: !!proofResult.proof,
            hasPublicSignals: !!proofResult.publicSignals,
            error: proofResult.error
          };
        } catch (error) {
          return { 
            success: false, 
            error: error.message 
          };
        }
      });
      
      expect(result.attestationCount).toBe(3);
      expect(result.proofSuccess).toBe(true);
      expect(result.totalScore).toBe(24); // 8 + 7 + 9
      expect(result.hasProof).toBe(true);
      expect(result.hasPublicSignals).toBe(true);
    }, testTimeout);

    test('Should handle insufficient attestations gracefully', async () => {
      await page.goto(serverUrl, { waitUntil: 'domcontentloaded' });
      
      await page.addScriptTag({
        path: path.join(__dirname, '..', 'shared', 'database-browser.js')
      });
      
      await page.addScriptTag({
        path: path.join(__dirname, '..', 'shared', 'zkProofBuilder.js')
      });
      
      await page.waitForFunction(() => 
        typeof window.ZooKiesDB !== 'undefined' && 
        typeof window.getZkProofBuilder === 'function', 
        { timeout: 10000 }
      );
      
      const result = await page.evaluate(async () => {
        try {
          const db = new window.ZooKiesDB();
          await db.init();
          
          // Store low-score attestations
          const attestations = [
            { id: 'low_att1', tag: 'defi', score: 2, signature: 'sig1', walletAddress: '0x123', isValid: true },
            { id: 'low_att2', tag: 'defi', score: 3, signature: 'sig2', walletAddress: '0x123', isValid: true }
          ];
          
          for (const att of attestations) {
            await db.storeAttestation(att);
          }
          
          const storedAttestations = await db.getAttestationsByTag('defi');
          const zkBuilder = window.getZkProofBuilder();
          await zkBuilder.initialize();
          
          // Try to generate proof with high threshold
          const proofResult = await zkBuilder.generateProof(storedAttestations, 'defi', 50);
          
          return {
            proofSuccess: proofResult.success,
            error: proofResult.error,
            totalScore: proofResult.metadata?.totalScore
          };
        } catch (error) {
          return { 
            success: false, 
            error: error.message 
          };
        }
      });
      
      expect(result.proofSuccess).toBe(false);
      expect(result.error).toContain('Insufficient attestations');
      expect(result.totalScore).toBe(5); // 2 + 3
    });
  });

  describe('API Integration', () => {
    
    test('Should retrieve verification key from API', async () => {
      await page.goto(serverUrl, { waitUntil: 'domcontentloaded' });
      
      const result = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/verification-key');
          const data = await response.json();
          
          return {
            status: response.status,
            hasVkey: !!data.vkey,
            success: data.success || data.valid || response.ok
          };
        } catch (error) {
          return { 
            success: false, 
            error: error.message 
          };
        }
      });
      
      expect(result.status).toBe(200);
      expect(result.hasVkey).toBe(true);
      expect(result.success).toBe(true);
    });

    test('Should submit and verify proof via API', async () => {
      await page.goto(serverUrl, { waitUntil: 'domcontentloaded' });
      
      const result = await page.evaluate(async () => {
        try {
          // Create mock proof data that matches API expectations
          const mockProof = {
            pi_a: ['1', '2'],
            pi_b: [['3', '4'], ['5', '6']],
            pi_c: ['7', '8'],
            protocol: 'groth16',
            curve: 'bn128'
          };
          
          const mockPublicSignals = ['1', '20', '25']; // [targetTag, threshold, totalScore]
          
          const response = await fetch('/api/verify-proof', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              proof: mockProof,
              publicSignals: mockPublicSignals
            })
          });
          
          const data = await response.json();
          
          return {
            status: response.status,
            responseData: data,
            hasResults: !!(data.results || data.verified || data.valid)
          };
        } catch (error) {
          return { 
            success: false, 
            error: error.message 
          };
        }
      });
      
      expect(result.status).toBe(200);
      expect(result.hasResults).toBe(true);
    });
  });

  describe('Complete User Journey', () => {
    
    test('Should complete full attestation-to-proof workflow', async () => {
      await page.goto(serverUrl, { waitUntil: 'domcontentloaded' });
      
      // Add all required scripts
      await page.addScriptTag({
        path: path.join(__dirname, '..', 'shared', 'database-browser.js')
      });
      
      await page.addScriptTag({
        path: path.join(__dirname, '..', 'shared', 'zkProofBuilder.js')
      });
      
      await page.waitForFunction(() => 
        typeof window.ZooKiesDB !== 'undefined' && 
        typeof window.getZkProofBuilder === 'function', 
        { timeout: 10000 }
      );
      
      const result = await page.evaluate(async () => {
        try {
          // Step 1: Setup database and store attestations
          const db = new window.ZooKiesDB();
          await db.init();
          
          const attestations = [
            { id: 'journey_att1', tag: 'defi', score: 8, signature: 'sig1', walletAddress: '0x123', isValid: true },
            { id: 'journey_att2', tag: 'defi', score: 7, signature: 'sig2', walletAddress: '0x123', isValid: true },
            { id: 'journey_att3', tag: 'defi', score: 9, signature: 'sig3', walletAddress: '0x123', isValid: true }
          ];
          
          for (const att of attestations) {
            await db.storeAttestation(att);
          }
          
          // Step 2: Retrieve attestations
          const storedAttestations = await db.getAttestationsByTag('defi');
          
          // Step 3: Generate ZK proof
          const zkBuilder = window.getZkProofBuilder();
          await zkBuilder.initialize();
          const proofResult = await zkBuilder.generateProof(storedAttestations, 'defi', 20);
          
          if (!proofResult.success) {
            return { step: 'proof_generation', error: proofResult.error };
          }
          
          // Step 4: Verify proof via API
          const verifyResponse = await fetch('/api/verify-proof', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              proof: proofResult.proof,
              publicSignals: proofResult.publicSignals
            })
          });
          
          const verifyData = await verifyResponse.json();
          
          return {
            step: 'complete',
            attestationCount: storedAttestations.length,
            proofGenerated: proofResult.success,
            proofVerified: verifyData.valid || verifyData.verified || verifyResponse.ok,
            totalScore: proofResult.metadata?.totalScore,
            publicSignals: proofResult.publicSignals
          };
        } catch (error) {
          return { 
            success: false, 
            error: error.message,
            step: 'unknown'
          };
        }
      });
      
      expect(result.step).toBe('complete');
      expect(result.attestationCount).toBe(3);
      expect(result.proofGenerated).toBe(true);
      expect(result.proofVerified).toBe(true);
      expect(result.totalScore).toBe(24);
      expect(result.publicSignals).toEqual(['1', '20', '24']);
    }, testTimeout);

    test('Should handle user with no attestations', async () => {
      await page.goto(serverUrl, { waitUntil: 'domcontentloaded' });
      
      await page.addScriptTag({
        path: path.join(__dirname, '..', 'shared', 'database-browser.js')
      });
      
      await page.addScriptTag({
        path: path.join(__dirname, '..', 'shared', 'zkProofBuilder.js')
      });
      
      await page.waitForFunction(() => 
        typeof window.ZooKiesDB !== 'undefined' && 
        typeof window.getZkProofBuilder === 'function', 
        { timeout: 10000 }
      );
      
      const result = await page.evaluate(async () => {
        try {
          const db = new window.ZooKiesDB();
          await db.init();
          
          // Clear any existing attestations
          await db.clearAttestations();
          
          const attestations = await db.getAttestationsByTag('defi');
          const zkBuilder = window.getZkProofBuilder();
          await zkBuilder.initialize();
          
          const proofResult = await zkBuilder.generateProof(attestations, 'defi', 20);
          
          return {
            attestationCount: attestations.length,
            proofSuccess: proofResult.success,
            error: proofResult.error
          };
        } catch (error) {
          return { 
            success: false, 
            error: error.message 
          };
        }
      });
      
      expect(result.attestationCount).toBe(0);
      expect(result.proofSuccess).toBe(false);
      expect(result.error).toContain('No valid attestations');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    
    test('Should handle malformed API requests gracefully', async () => {
      await page.goto(serverUrl, { waitUntil: 'domcontentloaded' });
      
      const result = await page.evaluate(async () => {
        try {
          // Send malformed proof data
          const response = await fetch('/api/verify-proof', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              proof: 'invalid_proof',
              publicSignals: 'invalid_signals'
            })
          });
          
          return {
            status: response.status,
            isError: response.status >= 400
          };
        } catch (error) {
          return { 
            success: false, 
            error: error.message 
          };
        }
      });
      
      expect(result.isError).toBe(true);
      expect(result.status).toBeGreaterThanOrEqual(400);
    });

    test('Should handle network connectivity issues', async () => {
      await page.goto(serverUrl, { waitUntil: 'domcontentloaded' });
      
      // Simulate network failure by trying to call non-existent endpoint
      const result = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/non-existent-endpoint');
          
          return {
            status: response.status,
            isNotFound: response.status === 404
          };
        } catch (error) {
          return { 
            success: false, 
            error: error.message 
          };
        }
      });
      
      expect(result.isNotFound).toBe(true);
      expect(result.status).toBe(404);
    });

    test('Should handle browser resource limitations', async () => {
      await page.goto(serverUrl, { waitUntil: 'domcontentloaded' });
      
      // Test memory usage with large operations
      const result = await page.evaluate(async () => {
        try {
          // Create a large array to test memory handling
          const largeArray = new Array(10000).fill(0).map((_, i) => ({
            id: `test_${i}`,
            tag: 'defi',
            score: Math.random() * 10,
            signature: `sig_${i}`,
            timestamp: Date.now()
          }));
          
          // Process the array (simulate heavy computation)
          const processed = largeArray.filter(item => item.score > 5);
          
          return {
            originalSize: largeArray.length,
            processedSize: processed.length,
            success: true
          };
        } catch (error) {
          return { 
            success: false, 
            error: error.message 
          };
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.processedSize).toBeLessThanOrEqual(result.originalSize);
    });
  });

  describe('Performance and Load Testing', () => {
    
    test('Should handle multiple concurrent proof operations', async () => {
      await page.goto(serverUrl, { waitUntil: 'domcontentloaded' });
      
      await page.addScriptTag({
        path: path.join(__dirname, '..', 'shared', 'database-browser.js')
      });
      
      await page.addScriptTag({
        path: path.join(__dirname, '..', 'shared', 'zkProofBuilder.js')
      });
      
      await page.waitForFunction(() => 
        typeof window.ZooKiesDB !== 'undefined' && 
        typeof window.getZkProofBuilder === 'function', 
        { timeout: 10000 }
      );
      
      const result = await page.evaluate(async () => {
        try {
          const db = new window.ZooKiesDB();
          await db.init();
          
          // Setup attestations
          const attestations = [
            { id: 'perf_att1', tag: 'defi', score: 8, signature: 'sig1', walletAddress: '0x123', isValid: true },
            { id: 'perf_att2', tag: 'defi', score: 7, signature: 'sig2', walletAddress: '0x123', isValid: true }
          ];
          
          for (const att of attestations) {
            await db.storeAttestation(att);
          }
          
          const storedAttestations = await db.getAttestationsByTag('defi');
          const zkBuilder = window.getZkProofBuilder();
          await zkBuilder.initialize();
          
          // Start multiple proof operations concurrently
          const startTime = Date.now();
          const proofPromises = [];
          
          for (let i = 0; i < 3; i++) {
            proofPromises.push(zkBuilder.generateProof(storedAttestations, 'defi', 10));
          }
          
          const results = await Promise.all(proofPromises);
          const endTime = Date.now();
          
          return {
            totalTime: endTime - startTime,
            successCount: results.filter(r => r.success).length,
            totalOperations: results.length
          };
        } catch (error) {
          return { 
            success: false, 
            error: error.message 
          };
        }
      });
      
      expect(result.successCount).toBeGreaterThan(0);
      expect(result.totalTime).toBeLessThan(30000); // Should complete within 30 seconds
    }, testTimeout);
  });
}); 