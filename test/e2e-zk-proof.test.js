/**
 * End-to-End ZK Proof Integration Tests
 * Complete flow testing from attestation creation to proof verification
 */

const puppeteer = require('puppeteer');
const request = require('supertest');
const app = require('../server');
const path = require('path');
const fs = require('fs');

describe('E2E ZK Proof Integration Tests', () => {
  let browser;
  let page;
  
  const DEMO_SITES = [
    { name: 'Modern Byte', path: '/themodernbyte', url: 'http://localhost:3000/themodernbyte' },
    { name: 'Smart Living', path: '/smartlivingguide', url: 'http://localhost:3000/smartlivingguide' }
  ];

  beforeAll(async () => {
    // Launch browser for testing
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    
    // Set up console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('PAGE ERROR:', msg.text());
      }
    });

    // Set up page error handling
    page.on('pageerror', error => {
      console.log('PAGE CRASH:', error.toString());
    });

    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  describe('Complete ZK Proof Pipeline', () => {
    
    test('Should complete full attestation to proof verification flow', async () => {
      // Step 1: Navigate to demo site
      await page.goto(DEMO_SITES[0].url);
      await page.waitForLoadState('networkidle');

      // Step 2: Initialize wallet and create attestations
      await page.evaluate(async () => {
        // Initialize zkAffinityAgent with mock wallet
        if (window.zkAffinityAgent) {
          await window.zkAffinityAgent.initializeForTesting();
          
          // Create test attestations
          const testAttestations = [
            { tag: 'defi', score: 8 },
            { tag: 'defi', score: 7 },
            { tag: 'defi', score: 9 },
            { tag: 'privacy', score: 6 }
          ];

          for (const att of testAttestations) {
            await window.zkAffinityAgent.createAttestation(att.tag, att.score);
          }
        }
      });

      // Step 3: Generate ZK proof
      const proofResult = await page.evaluate(async () => {
        if (window.zkAffinityAgent && window.zkAffinityAgent.prove) {
          return await window.zkAffinityAgent.prove({
            tag: 'defi',
            threshold: 20
          });
        }
        return null;
      });

      expect(proofResult).toBeTruthy();
      expect(proofResult.success).toBe(true);
      expect(proofResult.proof).toBeDefined();
      expect(proofResult.publicSignals).toBeDefined();

      // Step 4: Verify proof via API
      const verificationResponse = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: proofResult.proof,
          publicSignals: proofResult.publicSignals
        });

      expect(verificationResponse.status).toBe(200);
      expect(verificationResponse.body.success).toBe(true);
      expect(verificationResponse.body.metadata.tag).toBe('defi');
    }, 60000); // 60 second timeout for full pipeline

    test('Should handle insufficient attestations gracefully', async () => {
      await page.goto(DEMO_SITES[0].url);
      await page.waitForLoadState('networkidle');

      const proofResult = await page.evaluate(async () => {
        if (window.zkAffinityAgent) {
          await window.zkAffinityAgent.initializeForTesting();
          
          // Create insufficient attestations
          await window.zkAffinityAgent.createAttestation('defi', 3);
          
          return await window.zkAffinityAgent.prove({
            tag: 'defi',
            threshold: 50 // Too high for single attestation
          });
        }
        return null;
      });

      expect(proofResult.success).toBe(false);
      expect(proofResult.error).toContain('Insufficient attestations');
    });
  });

  describe('Cross-Site Proof Generation', () => {
    
    test('Should generate proofs on both demo sites', async () => {
      for (const site of DEMO_SITES) {
        await page.goto(site.url);
        await page.waitForLoadState('networkidle');

        // Test zkAffinityAgent availability
        const hasAgent = await page.evaluate(() => {
          return typeof window.zkAffinityAgent !== 'undefined';
        });

        expect(hasAgent).toBe(true);

        // Test proof generation capability
        const canGenerateProof = await page.evaluate(() => {
          return typeof window.zkAffinityAgent.prove === 'function';
        });

        expect(canGenerateProof).toBe(true);
      }
    });

    test('Should maintain proof generation consistency across sites', async () => {
      const proofResults = [];

      for (const site of DEMO_SITES) {
        await page.goto(site.url);
        await page.waitForLoadState('networkidle');

        const result = await page.evaluate(async () => {
          if (window.zkAffinityAgent) {
            await window.zkAffinityAgent.initializeForTesting();
            
            // Create identical attestations
            await window.zkAffinityAgent.createAttestation('privacy', 10);
            await window.zkAffinityAgent.createAttestation('privacy', 15);
            
            return await window.zkAffinityAgent.prove({
              tag: 'privacy',
              threshold: 20
            });
          }
          return null;
        });

        proofResults.push(result);
      }

      // Both sites should succeed with identical inputs
      expect(proofResults[0].success).toBe(true);
      expect(proofResults[1].success).toBe(true);
      
      // Should have same tag and threshold in public signals
      expect(proofResults[0].publicSignals[0]).toBe(proofResults[1].publicSignals[0]); // tag
      expect(proofResults[0].publicSignals[1]).toBe(proofResults[1].publicSignals[1]); // threshold
    });
  });

  describe('zkAffinityAgent Integration', () => {
    
    test('Should integrate prove() method with ad targeting logic', async () => {
      await page.goto(DEMO_SITES[0].url);
      await page.waitForLoadState('networkidle');

      const adResult = await page.evaluate(async () => {
        if (window.zkAffinityAgent) {
          await window.zkAffinityAgent.initializeForTesting();
          
          // Create sufficient attestations for targeting
          await window.zkAffinityAgent.createAttestation('defi', 10);
          await window.zkAffinityAgent.createAttestation('defi', 15);
          
          return await window.zkAffinityAgent.requestAd({
            tag: 'defi',
            threshold: 20
          });
        }
        return null;
      });

      expect(adResult).toBeTruthy();
      expect(adResult.success).toBe(true);
      expect(adResult.isTargeted).toBe(true);
      expect(adResult.adContent).toBeDefined();
      expect(adResult.adContent.tag).toBe('defi');
    });

    test('Should show fallback ads for insufficient attestations', async () => {
      await page.goto(DEMO_SITES[0].url);
      await page.waitForLoadState('networkidle');

      const adResult = await page.evaluate(async () => {
        if (window.zkAffinityAgent) {
          await window.zkAffinityAgent.initializeForTesting();
          
          // Create insufficient attestations
          await window.zkAffinityAgent.createAttestation('defi', 5);
          
          return await window.zkAffinityAgent.requestAd({
            tag: 'defi',
            threshold: 50
          });
        }
        return null;
      });

      expect(adResult).toBeTruthy();
      expect(adResult.success).toBe(true);
      expect(adResult.isTargeted).toBe(false);
      expect(adResult.adContent.title).toContain('Discover');
    });

    test('Should render ads correctly in DOM', async () => {
      await page.goto(DEMO_SITES[0].url);
      await page.waitForLoadState('networkidle');

      // Inject ad container
      await page.evaluate(() => {
        const container = document.createElement('div');
        container.id = 'test-ad-container';
        document.body.appendChild(container);
      });

      await page.evaluate(async () => {
        if (window.zkAffinityAgent) {
          await window.zkAffinityAgent.initializeForTesting();
          
          // Create attestations and render ad
          await window.zkAffinityAgent.createAttestation('technology', 20);
          
          await window.zkAffinityAgent.renderAd('technology', 
            document.getElementById('test-ad-container'), 
            { threshold: 15 }
          );
        }
      });

      // Check if ad was rendered
      const adRendered = await page.evaluate(() => {
        const container = document.getElementById('test-ad-container');
        return container && container.children.length > 0;
      });

      expect(adRendered).toBe(true);

      // Check ad styling
      const hasAdStyles = await page.evaluate(() => {
        const adElement = document.querySelector('#test-ad-container .zk-ad');
        return adElement !== null;
      });

      expect(hasAdStyles).toBe(true);
    });
  });

  describe('Browser Compatibility', () => {
    
    test('Should work in different browser contexts', async () => {
      // Test in incognito/private mode
      const incognitoContext = await browser.createIncognitoBrowserContext();
      const incognitoPage = await incognitoContext.newPage();
      
      try {
        await incognitoPage.goto(DEMO_SITES[0].url);
        await incognitoPage.waitForLoadState('networkidle');

        const works = await incognitoPage.evaluate(() => {
          return typeof window.zkAffinityAgent !== 'undefined';
        });

        expect(works).toBe(true);
      } finally {
        await incognitoPage.close();
        await incognitoContext.close();
      }
    });

    test('Should handle IndexedDB operations correctly', async () => {
      await page.goto(DEMO_SITES[0].url);
      await page.waitForLoadState('networkidle');

      const dbResult = await page.evaluate(async () => {
        if (window.zkAffinityAgent) {
          await window.zkAffinityAgent.initializeForTesting();
          
          // Test database operations
          await window.zkAffinityAgent.createAttestation('gaming', 12);
          
          // Retrieve attestations
          const attestations = await window.zkAffinityAgent.dbManager.getAllAttestations();
          
          return {
            count: attestations.length,
            hasGaming: attestations.some(att => att.tag === 'gaming')
          };
        }
        return null;
      });

      expect(dbResult.count).toBeGreaterThan(0);
      expect(dbResult.hasGaming).toBe(true);
    });
  });

  describe('Performance Testing', () => {
    
    test('Should complete proof generation within time limits', async () => {
      await page.goto(DEMO_SITES[0].url);
      await page.waitForLoadState('networkidle');

      const { duration, success } = await page.evaluate(async () => {
        if (window.zkAffinityAgent) {
          await window.zkAffinityAgent.initializeForTesting();
          
          // Create multiple attestations for performance testing
          for (let i = 0; i < 10; i++) {
            await window.zkAffinityAgent.createAttestation('finance', Math.floor(Math.random() * 10) + 1);
          }
          
          const startTime = Date.now();
          const result = await window.zkAffinityAgent.prove({
            tag: 'finance',
            threshold: 30
          });
          const endTime = Date.now();
          
          return {
            duration: endTime - startTime,
            success: result.success
          };
        }
        return { duration: 0, success: false };
      });

      expect(success).toBe(true);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('Should handle concurrent proof requests', async () => {
      await page.goto(DEMO_SITES[0].url);
      await page.waitForLoadState('networkidle');

      const results = await page.evaluate(async () => {
        if (window.zkAffinityAgent) {
          await window.zkAffinityAgent.initializeForTesting();
          
          // Create attestations
          for (let i = 0; i < 5; i++) {
            await window.zkAffinityAgent.createAttestation('travel', 8);
          }
          
          // Start concurrent proof generations
          const promises = [];
          for (let i = 0; i < 3; i++) {
            promises.push(window.zkAffinityAgent.prove({
              tag: 'travel',
              threshold: 20
            }));
          }
          
          return await Promise.all(promises);
        }
        return [];
      });

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    
    test('Should handle network failures gracefully', async () => {
      await page.goto(DEMO_SITES[0].url);
      await page.waitForLoadState('networkidle');

      // Simulate network failure by going offline
      await page.setOfflineMode(true);

      const result = await page.evaluate(async () => {
        if (window.zkAffinityAgent) {
          await window.zkAffinityAgent.initializeForTesting();
          
          // Try to create attestation while offline
          try {
            await window.zkAffinityAgent.createAttestation('defi', 10);
            return { success: true, error: null };
          } catch (error) {
            return { success: false, error: error.message };
          }
        }
        return { success: false, error: 'Agent not available' };
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Restore connection
      await page.setOfflineMode(false);
    });

    test('Should recover from database errors', async () => {
      await page.goto(DEMO_SITES[0].url);
      await page.waitForLoadState('networkidle');

      const recoveryResult = await page.evaluate(async () => {
        if (window.zkAffinityAgent) {
          try {
            await window.zkAffinityAgent.initializeForTesting();
            
            // Force database reset and recovery
            await window.zkAffinityAgent.dbManager.resetDatabase();
            await window.zkAffinityAgent.dbManager.initialize();
            
            // Try operations after recovery
            await window.zkAffinityAgent.createAttestation('technology', 15);
            const attestations = await window.zkAffinityAgent.dbManager.getAllAttestations();
            
            return { recovered: true, attestationCount: attestations.length };
          } catch (error) {
            return { recovered: false, error: error.message };
          }
        }
        return { recovered: false, error: 'Agent not available' };
      });

      expect(recoveryResult.recovered).toBe(true);
      expect(recoveryResult.attestationCount).toBeGreaterThan(0);
    });
  });

  describe('Demo Interface Testing', () => {
    
    test('Should execute demo methods successfully', async () => {
      await page.goto(DEMO_SITES[0].url);
      await page.waitForLoadState('networkidle');

      // Test proveDemo
      const proveDemo = await page.evaluate(async () => {
        if (window.zkAffinityAgent && window.zkAffinityAgent.proveDemo) {
          return await window.zkAffinityAgent.proveDemo('defi', 25);
        }
        return null;
      });

      expect(proveDemo).toBeTruthy();
      expect(proveDemo.success).toBe(true);

      // Test adDemo
      const adDemo = await page.evaluate(async () => {
        if (window.zkAffinityAgent && window.zkAffinityAgent.adDemo) {
          return await window.zkAffinityAgent.adDemo('privacy', 20);
        }
        return null;
      });

      expect(adDemo).toBeTruthy();
      expect(adDemo.success).toBe(true);

      // Test fullDemo
      const fullDemo = await page.evaluate(async () => {
        if (window.zkAffinityAgent && window.zkAffinityAgent.fullDemo) {
          return await window.zkAffinityAgent.fullDemo('gaming', 30);
        }
        return null;
      });

      expect(fullDemo).toBeTruthy();
      expect(fullDemo.success).toBe(true);
    });

    test('Should provide helpful help interface', async () => {
      await page.goto(DEMO_SITES[0].url);
      await page.waitForLoadState('networkidle');

      const helpOutput = await page.evaluate(() => {
        if (window.zkAffinityAgent && window.zkAffinityAgent.help) {
          // Capture console output
          const originalLog = console.log;
          let helpText = '';
          console.log = (text) => { helpText += text + '\n'; };
          
          window.zkAffinityAgent.help();
          
          console.log = originalLog;
          return helpText;
        }
        return '';
      });

      expect(helpOutput).toContain('ZK Affinity Agent');
      expect(helpOutput).toContain('prove()');
      expect(helpOutput).toContain('requestAd()');
      expect(helpOutput).toContain('Examples:');
    });
  });
});

// Helper function for waiting for load state (if not available)
if (!puppeteer.Page.prototype.waitForLoadState) {
  puppeteer.Page.prototype.waitForLoadState = async function(state = 'load') {
    return new Promise((resolve) => {
      if (state === 'networkidle') {
        this.waitForLoadState('networkidle0', { timeout: 30000 })
          .then(resolve)
          .catch(() => this.waitForLoadState('load').then(resolve));
      } else {
        this.waitForLoadState(state).then(resolve);
      }
    });
  };
}

module.exports = {
  DEMO_SITES
}; 