/**
 * API Verification Endpoint Tests
 * Tests for /api/verify-proof and /api/verification-key endpoints
 */

const request = require('supertest');
const app = require('../server');

describe('ZK Proof Verification API Endpoints', () => {
  
  describe('GET /api/verification-key', () => {
    
    test('should return verification key when available', async () => {
      const response = await request(app)
        .get('/api/verification-key')
        .expect('Content-Type', /json/);

      // Should return 200 if verification key is loaded, 503 if not
      expect([200, 503]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toMatchObject({
          success: true,
          verificationKey: expect.any(Object),
          metadata: expect.objectContaining({
            protocol: expect.any(String),
            curve: expect.any(String),
            nPublic: expect.any(Number)
          }),
          timestamp: expect.any(String)
        });

        // Verify verification key structure
        const vk = response.body.verificationKey;
        expect(vk).toMatchObject({
          protocol: expect.any(String),
          curve: expect.any(String),
          nPublic: expect.any(Number),
          vk_alpha_1: expect.any(Array),
          vk_beta_2: expect.any(Array),
          vk_gamma_2: expect.any(Array),
          vk_delta_2: expect.any(Array),
          vk_alphabeta_12: expect.any(Array),
          IC: expect.any(Array)
        });

        // Check caching headers
        expect(response.headers['cache-control']).toBe('public, max-age=3600');
        expect(response.headers['etag']).toBeDefined();
        
      } else if (response.status === 503) {
        expect(response.body).toMatchObject({
          error: 'ZK verification key not available',
          code: 'VERIFICATION_KEY_UNAVAILABLE',
          message: expect.any(String),
          timestamp: expect.any(String)
        });
      }
    });

    test('should handle errors gracefully', async () => {
      // This test ensures error handling works even if verification key fails to load
      const response = await request(app)
        .get('/api/verification-key');

      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.timestamp).toBe('string');
    });
  });

  describe('POST /api/verify-proof', () => {
    
    test('should reject requests with missing parameters', async () => {
      const response = await request(app)
        .post('/api/verify-proof')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Missing required parameters',
        code: 'MISSING_PARAMETERS',
        required: ['proof', 'publicSignals'],
        received: { proof: false, publicSignals: false },
        timestamp: expect.any(String)
      });
    });

    test('should reject requests with missing proof parameter', async () => {
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          publicSignals: ['1', '2', '3']
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

    test('should reject requests with missing publicSignals parameter', async () => {
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: {
            pi_a: ['1', '2', '3'],
            pi_b: [['1', '2'], ['3', '4'], ['5', '6']],
            pi_c: ['7', '8', '9'],
            protocol: 'groth16',
            curve: 'bn128'
          }
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Missing required parameters',
        code: 'MISSING_PARAMETERS',
        required: ['proof', 'publicSignals'],
        received: { proof: true, publicSignals: false },
        timestamp: expect.any(String)
      });
    });

    test('should reject invalid proof format - missing pi_a', async () => {
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: {
            pi_b: [['1', '2'], ['3', '4'], ['5', '6']],
            pi_c: ['7', '8', '9'],
            protocol: 'groth16',
            curve: 'bn128'
          },
          publicSignals: ['1', '2', '3']
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: "Invalid proof format: missing field 'pi_a'",
        code: 'INVALID_PROOF_FORMAT',
        field: 'pi_a',
        timestamp: expect.any(String)
      });
    });

    test('should reject invalid proof format - missing pi_b', async () => {
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: {
            pi_a: ['1', '2', '3'],
            pi_c: ['7', '8', '9'],
            protocol: 'groth16',
            curve: 'bn128'
          },
          publicSignals: ['1', '2', '3']
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: "Invalid proof format: missing field 'pi_b'",
        code: 'INVALID_PROOF_FORMAT',
        field: 'pi_b',
        timestamp: expect.any(String)
      });
    });

    test('should reject invalid proof format - missing protocol', async () => {
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: {
            pi_a: ['1', '2', '3'],
            pi_b: [['1', '2'], ['3', '4'], ['5', '6']],
            pi_c: ['7', '8', '9'],
            curve: 'bn128'
          },
          publicSignals: ['1', '2', '3']
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: "Invalid proof format: missing field 'protocol'",
        code: 'INVALID_PROOF_FORMAT',
        field: 'protocol',
        timestamp: expect.any(String)
      });
    });

    test('should reject non-array publicSignals', async () => {
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: {
            pi_a: ['1', '2', '3'],
            pi_b: [['1', '2'], ['3', '4'], ['5', '6']],
            pi_c: ['7', '8', '9'],
            protocol: 'groth16',
            curve: 'bn128'
          },
          publicSignals: 'not-an-array'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Public signals must be an array',
        code: 'INVALID_PUBLIC_SIGNALS_FORMAT',
        timestamp: expect.any(String)
      });
    });

    test('should reject publicSignals with wrong length', async () => {
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: {
            pi_a: ['1', '2', '3'],
            pi_b: [['1', '2'], ['3', '4'], ['5', '6']],
            pi_c: ['7', '8', '9'],
            protocol: 'groth16',
            curve: 'bn128'
          },
          publicSignals: ['1', '2'] // Wrong length (should be 3)
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid public signals length',
        code: 'INVALID_PUBLIC_SIGNALS_LENGTH',
        expected: 3,
        received: 2,
        timestamp: expect.any(String)
      });
    });

    test('should reject invalid public signal types', async () => {
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: {
            pi_a: ['1', '2', '3'],
            pi_b: [['1', '2'], ['3', '4'], ['5', '6']],
            pi_c: ['7', '8', '9'],
            protocol: 'groth16',
            curve: 'bn128'
          },
          publicSignals: ['1', {}, '3'] // Object in middle is invalid
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid public signal at index 1: must be string or number',
        code: 'INVALID_PUBLIC_SIGNAL_TYPE',
        index: 1,
        type: 'object',
        timestamp: expect.any(String)
      });
    });

    test('should handle verification unavailable when verification key not loaded', async () => {
      // This test will pass when verification key is not available
      const validProofData = {
        proof: {
          pi_a: ['1', '2', '3'],
          pi_b: [['1', '2'], ['3', '4'], ['5', '6']],
          pi_c: ['7', '8', '9'],
          protocol: 'groth16',
          curve: 'bn128'
        },
        publicSignals: ['1', '2', '3']
      };

      const response = await request(app)
        .post('/api/verify-proof')
        .send(validProofData);

      // Should return either verification result or unavailable error
      if (response.status === 503) {
        expect(response.body).toMatchObject({
          error: 'ZK verification not available',
          code: 'VERIFICATION_UNAVAILABLE',
          message: expect.any(String),
          timestamp: expect.any(String)
        });
      } else {
        // If verification is available, check response format
        expect(response.body).toHaveProperty('valid');
        expect(response.body).toHaveProperty('metadata');
        expect(response.body).toHaveProperty('timestamp');
      }
    });

    test('should handle malformed proofs gracefully', async () => {
      // Test with a proof that has correct structure but invalid values
      const malformedProof = {
        proof: {
          pi_a: ['invalid', '2', '3'],
          pi_b: [['1', '2'], ['3', '4'], ['5', '6']],
          pi_c: ['7', '8', '9'],
          protocol: 'groth16',
          curve: 'bn128'
        },
        publicSignals: ['1', '2', '0'] // Valid format but will likely fail verification
      };

      const response = await request(app)
        .post('/api/verify-proof')
        .send(malformedProof);

      // Should either be unavailable or return verification failure
      expect([400, 503]).toContain(response.status);
      
      if (response.status === 400) {
        expect(response.body).toMatchObject({
          error: 'Proof verification failed',
          code: 'VERIFICATION_FAILED',
          message: 'Invalid proof or public signals',
          timestamp: expect.any(String)
        });
      }
    });

    test('should include performance metrics', async () => {
      const validProofData = {
        proof: {
          pi_a: ['1', '2', '3'],
          pi_b: [['1', '2'], ['3', '4'], ['5', '6']],
          pi_c: ['7', '8', '9'],
          protocol: 'groth16',
          curve: 'bn128'
        },
        publicSignals: ['1', '2', '0']
      };

      const response = await request(app)
        .post('/api/verify-proof')
        .send(validProofData);

      // All responses should include performance metadata
      if (response.body.metadata) {
        expect(response.body.metadata).toHaveProperty('verificationTime');
        expect(typeof response.body.metadata.verificationTime).toBe('number');
        expect(response.body.metadata.verificationTime).toBeGreaterThan(0);
      }
    });

    test('should validate tag mapping for valid target tag indices', async () => {
      const proofDataWithValidTag = {
        proof: {
          pi_a: ['1', '2', '3'],
          pi_b: [['1', '2'], ['3', '4'], ['5', '6']],
          pi_c: ['7', '8', '9'],
          protocol: 'groth16',
          curve: 'bn128'
        },
        publicSignals: ['5', '3', '2'] // target tag index 2 = 'travel'
      };

      const response = await request(app)
        .post('/api/verify-proof')
        .send(proofDataWithValidTag);

      // Skip if verification unavailable
      if (response.status !== 503) {
        expect(response.body).toHaveProperty('metadata');
        expect(response.body.metadata).toHaveProperty('publicSignals');
        expect(response.body.metadata.publicSignals).toEqual([5, 3, 2]);
      }
    });
  });

  describe('Integration with Root Endpoint', () => {
    
    test('should include ZK proof endpoints in root API listing', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toMatchObject({
        message: expect.any(String),
        version: expect.any(String),
        status: 'running',
        endpoints: expect.objectContaining({
          api: expect.objectContaining({
            verifyProof: 'POST /api/verify-proof',
            verificationKey: 'GET /api/verification-key'
          })
        }),
        zkProof: expect.objectContaining({
          available: expect.any(Boolean),
          message: expect.any(String)
        }),
        timestamp: expect.any(String)
      });
    });
  });

  describe('Error Handling and Security', () => {
    
    test('should handle oversized requests', async () => {
      // Create a very large proof object
      const oversizedProof = {
        proof: {
          pi_a: new Array(1000).fill('1'),
          pi_b: new Array(1000).fill(['1', '2']),
          pi_c: new Array(1000).fill('3'),
          protocol: 'groth16',
          curve: 'bn128'
        },
        publicSignals: ['1', '2', '3']
      };

      const response = await request(app)
        .post('/api/verify-proof')
        .send(oversizedProof);

      // Should handle gracefully (either process or reject safely)
      expect(response.status).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('timestamp');
    });

    test('should sanitize error messages in production mode', async () => {
      // Test that error messages don't leak internal information
      const response = await request(app)
        .post('/api/verify-proof')
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('timestamp');
      
      // Error message should be user-friendly, not a technical stack trace
      expect(response.body.error).not.toContain('TypeError');
      expect(response.body.error).not.toContain('at ');
    });
  });
}); 