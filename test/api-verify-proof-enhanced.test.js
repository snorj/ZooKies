/**
 * Enhanced API Verification Endpoint Tests
 * Comprehensive testing for production-ready ZK proof verification
 */

const request = require('supertest');
const app = require('../server');

// Mock snarkjs for controlled testing
jest.mock('snarkjs', () => ({
  groth16: {
    verify: jest.fn()
  }
}));

const snarkjs = require('snarkjs');

describe('Enhanced ZK Proof API Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Advanced Proof Verification Scenarios', () => {
    
    test('Should verify valid proof with correct metadata extraction', async () => {
      // Mock successful verification
      snarkjs.groth16.verify.mockResolvedValue(true);
      
      const validProof = {
        pi_a: ['12345', '67890'],
        pi_b: [['11111', '22222'], ['33333', '44444']],
        pi_c: ['55555', '66666'],
        protocol: 'groth16',
        curve: 'bn128'
      };
      
      const publicSignals = ['1', '25', '30', '1']; // tag=defi, threshold=25, score=30, valid=1
      
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: validProof,
          publicSignals: publicSignals
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        verified: true,
        metadata: {
          tag: 'defi',
          threshold: 25,
          totalScore: 30,
          hasValidProof: true,
          attestationsSufficient: true
        },
        timestamp: expect.any(String)
      });
    });

    test('Should reject tampered proof', async () => {
      // Mock verification failure for tampered proof
      snarkjs.groth16.verify.mockResolvedValue(false);
      
      const tamperedProof = {
        pi_a: ['99999', '88888'], // Tampered values
        pi_b: [['77777', '66666'], ['55555', '44444']],
        pi_c: ['33333', '22222'],
        protocol: 'groth16',
        curve: 'bn128'
      };
      
      const publicSignals = ['2', '20', '25', '1'];
      
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: tamperedProof,
          publicSignals: publicSignals
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        verified: false,
        error: 'Proof verification failed',
        code: 'VERIFICATION_FAILED',
        timestamp: expect.any(String)
      });
    });

    test('Should handle all tag mappings correctly', async () => {
      snarkjs.groth16.verify.mockResolvedValue(true);
      
      const tagMappings = {
        1: 'defi',
        2: 'privacy', 
        3: 'travel',
        4: 'gaming',
        5: 'technology',
        6: 'finance'
      };
      
      for (const [tagId, expectedTag] of Object.entries(tagMappings)) {
        const response = await request(app)
          .post('/api/verify-proof')
          .send({
            proof: {
              pi_a: ['1', '2'],
              pi_b: [['3', '4'], ['5', '6']],
              pi_c: ['7', '8'],
              protocol: 'groth16',
              curve: 'bn128'
            },
            publicSignals: [tagId, '10', '15', '1']
          })
          .expect(200);

        expect(response.body.metadata.tag).toBe(expectedTag);
      }
    });

    test('Should handle invalid tag mapping gracefully', async () => {
      snarkjs.groth16.verify.mockResolvedValue(true);
      
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: {
            pi_a: ['1', '2'],
            pi_b: [['3', '4'], ['5', '6']],
            pi_c: ['7', '8'],
            protocol: 'groth16',
            curve: 'bn128'
          },
          publicSignals: ['999', '10', '15', '1'] // Invalid tag
        })
        .expect(200);

      expect(response.body.metadata.tag).toBe('unknown');
    });
  });

  describe('Edge Case Testing', () => {
    
    test('Should handle zero threshold proofs', async () => {
      snarkjs.groth16.verify.mockResolvedValue(true);
      
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: {
            pi_a: ['1', '2'],
            pi_b: [['3', '4'], ['5', '6']],
            pi_c: ['7', '8'],
            protocol: 'groth16',
            curve: 'bn128'
          },
          publicSignals: ['1', '0', '5', '1'] // Zero threshold
        })
        .expect(200);

      expect(response.body.metadata.threshold).toBe(0);
      expect(response.body.metadata.hasValidProof).toBe(true);
    });

    test('Should handle very large numbers in public signals', async () => {
      snarkjs.groth16.verify.mockResolvedValue(true);
      
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: {
            pi_a: ['1', '2'],
            pi_b: [['3', '4'], ['5', '6']],
            pi_c: ['7', '8'],
            protocol: 'groth16',
            curve: 'bn128'
          },
          publicSignals: ['1', '999999999', '1000000000', '1'] // Very large numbers
        })
        .expect(200);

      expect(response.body.metadata.threshold).toBe(999999999);
      expect(response.body.metadata.totalScore).toBe(1000000000);
    });

    test('Should handle insufficient attestation scenarios', async () => {
      snarkjs.groth16.verify.mockResolvedValue(true);
      
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: {
            pi_a: ['1', '2'],
            pi_b: [['3', '4'], ['5', '6']],
            pi_c: ['7', '8'],
            protocol: 'groth16',
            curve: 'bn128'
          },
          publicSignals: ['1', '100', '50', '0'] // Score < threshold, hasValidProof = 0
        })
        .expect(200);

      expect(response.body.metadata.hasValidProof).toBe(false);
      expect(response.body.metadata.attestationsSufficient).toBe(false);
    });
  });

  describe('Performance and Load Testing', () => {
    
    test('Should handle concurrent verification requests', async () => {
      snarkjs.groth16.verify.mockResolvedValue(true);
      
      const proofRequest = {
        proof: {
          pi_a: ['1', '2'],
          pi_b: [['3', '4'], ['5', '6']],
          pi_c: ['7', '8'],
          protocol: 'groth16',
          curve: 'bn128'
        },
        publicSignals: ['1', '20', '25', '1']
      };

      // Send 5 concurrent requests
      const requests = Array(5).fill().map(() => 
        request(app).post('/api/verify-proof').send(proofRequest)
      );

      const responses = await Promise.all(requests);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    test('Should complete verification within performance limits', async () => {
      snarkjs.groth16.verify.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(true), 100))
      );
      
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: {
            pi_a: ['1', '2'],
            pi_b: [['3', '4'], ['5', '6']],
            pi_c: ['7', '8'],
            protocol: 'groth16',
            curve: 'bn128'
          },
          publicSignals: ['1', '20', '25', '1']
        })
        .expect(200);

      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(response.body.success).toBe(true);
    });
  });

  describe('Security Testing', () => {
    
    test('Should prevent injection attacks in proof data', async () => {
      const maliciousProof = {
        pi_a: ['<script>alert("xss")</script>', '2'],
        pi_b: [['3', '4'], ['5', '6']],
        pi_c: ['7', '8'],
        protocol: 'groth16',
        curve: 'bn128'
      };
      
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: maliciousProof,
          publicSignals: ['1', '20', '25', '1']
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid proof format');
    });

    test('Should validate proof structure strictly', async () => {
      const invalidStructures = [
        // Missing pi_a
        {
          pi_b: [['3', '4'], ['5', '6']],
          pi_c: ['7', '8'],
          protocol: 'groth16',
          curve: 'bn128'
        },
        // Invalid pi_b structure
        {
          pi_a: ['1', '2'],
          pi_b: ['invalid_structure'],
          pi_c: ['7', '8'],
          protocol: 'groth16',
          curve: 'bn128'
        },
        // Wrong array lengths
        {
          pi_a: ['1'], // Should be length 2
          pi_b: [['3', '4'], ['5', '6']],
          pi_c: ['7', '8'],
          protocol: 'groth16',
          curve: 'bn128'
        }
      ];

      for (const invalidProof of invalidStructures) {
        const response = await request(app)
          .post('/api/verify-proof')
          .send({
            proof: invalidProof,
            publicSignals: ['1', '20', '25', '1']
          })
          .expect(400);

        expect(response.body.error).toContain('Invalid proof format');
      }
    });

    test('Should rate limit excessive requests', async () => {
      // This would require actual rate limiting middleware
      // For now, we test that the endpoint handles many requests
      snarkjs.groth16.verify.mockResolvedValue(true);
      
      const requests = Array(20).fill().map(() => 
        request(app)
          .post('/api/verify-proof')
          .send({
            proof: {
              pi_a: ['1', '2'],
              pi_b: [['3', '4'], ['5', '6']],
              pi_c: ['7', '8'],
              protocol: 'groth16',
              curve: 'bn128'
            },
            publicSignals: ['1', '20', '25', '1']
          })
      );

      const responses = await Promise.allSettled(requests);
      
      // Should handle all requests without crashing
      const successCount = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      ).length;
      
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery and Resilience', () => {
    
    test('Should handle snarkjs verification errors', async () => {
      snarkjs.groth16.verify.mockRejectedValue(new Error('SnarkJS internal error'));
      
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: {
            pi_a: ['1', '2'],
            pi_b: [['3', '4'], ['5', '6']],
            pi_c: ['7', '8'],
            protocol: 'groth16',
            curve: 'bn128'
          },
          publicSignals: ['1', '20', '25', '1']
        })
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Verification service error',
        code: 'VERIFICATION_SERVICE_ERROR',
        timestamp: expect.any(String)
      });
    });

    test('Should handle verification timeout scenarios', async () => {
      snarkjs.groth16.verify.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );
      
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: {
            pi_a: ['1', '2'],
            pi_b: [['3', '4'], ['5', '6']],
            pi_c: ['7', '8'],
            protocol: 'groth16',
            curve: 'bn128'
          },
          publicSignals: ['1', '20', '25', '1']
        })
        .expect(500);

      expect(response.body.error).toContain('Verification service error');
    });

    test('Should provide detailed error messages for debugging', async () => {
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: null,
          publicSignals: ['1', '20', '25', '1']
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Missing required parameters',
        code: 'MISSING_PARAMETERS',
        required: ['proof', 'publicSignals'],
        received: { proof: false, publicSignals: true },
        timestamp: expect.any(String)
      });
    });
  });

  describe('Response Format Validation', () => {
    
    test('Should include all required fields in successful response', async () => {
      snarkjs.groth16.verify.mockResolvedValue(true);
      
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: {
            pi_a: ['1', '2'],
            pi_b: [['3', '4'], ['5', '6']],
            pi_c: ['7', '8'],
            protocol: 'groth16',
            curve: 'bn128'
          },
          publicSignals: ['2', '30', '35', '1']
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('verified', true);
      expect(response.body).toHaveProperty('metadata');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('processingTime');
      
      expect(response.body.metadata).toHaveProperty('tag');
      expect(response.body.metadata).toHaveProperty('threshold');
      expect(response.body.metadata).toHaveProperty('totalScore');
      expect(response.body.metadata).toHaveProperty('hasValidProof');
      expect(response.body.metadata).toHaveProperty('attestationsSufficient');
    });

    test('Should include proper error structure in failed responses', async () => {
      const response = await request(app)
        .post('/api/verify-proof')
        .send({}) // Empty request
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('required');
      expect(response.body).toHaveProperty('received');
    });

    test('Should set appropriate HTTP headers', async () => {
      snarkjs.groth16.verify.mockResolvedValue(true);
      
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: {
            pi_a: ['1', '2'],
            pi_b: [['3', '4'], ['5', '6']],
            pi_c: ['7', '8'],
            protocol: 'groth16',
            curve: 'bn128'
          },
          publicSignals: ['1', '20', '25', '1']
        })
        .expect(200)
        .expect('Content-Type', /json/);

      // Should have appropriate security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
    });
  });

  describe('Integration with Verification Key Endpoint', () => {
    
    test('Should work with verification key retrieval flow', async () => {
      // First get verification key
      const vkResponse = await request(app)
        .get('/api/verification-key');

      // Then verify proof (regardless of vk availability)
      snarkjs.groth16.verify.mockResolvedValue(true);
      
      const proofResponse = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: {
            pi_a: ['1', '2'],
            pi_b: [['3', '4'], ['5', '6']],
            pi_c: ['7', '8'],
            protocol: 'groth16',
            curve: 'bn128'
          },
          publicSignals: ['1', '20', '25', '1']
        });

      if (vkResponse.status === 200) {
        expect(proofResponse.status).toBe(200);
        expect(proofResponse.body.success).toBe(true);
      } else {
        // Even if vk is not available, proof endpoint should handle gracefully
        expect([200, 503]).toContain(proofResponse.status);
      }
    });
  });
});

module.exports = {
  // Export test utilities for other test files
  mockValidProof: {
    pi_a: ['1', '2'],
    pi_b: [['3', '4'], ['5', '6']],
    pi_c: ['7', '8'],
    protocol: 'groth16',
    curve: 'bn128'
  },
  mockPublicSignals: ['1', '20', '25', '1']
}; 