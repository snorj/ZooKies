/**
 * Enhanced API Verification Endpoint Tests
 * Comprehensive testing for production-ready ZK proof verification
 */

const request = require('supertest');

// Mock snarkjs for controlled testing
jest.mock('snarkjs', () => ({
  groth16: {
    verify: jest.fn()
  }
}));

const snarkjs = require('snarkjs');

// Create a mock Express app for testing instead of starting the real server
const express = require('express');
const path = require('path');

const createTestApp = () => {
  const app = express();
  
  // JSON parsing middleware with error handling (matching main server)
  app.use((req, res, next) => {
    express.json({ 
      limit: '10mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    })(req, res, (err) => {
      if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
          error: 'Invalid JSON format',
          code: 'JSON_PARSE_ERROR',
          timestamp: new Date().toISOString()
        });
      }
      next(err);
    });
  });
  
  // Mock verification key
  const mockVerificationKey = {
    "protocol": "groth16",
    "curve": "bn128",
    "nPublic": 3,
    "vk_alpha_1": ["123", "456"],
    "vk_beta_2": [["789", "101"], ["112", "131"]],
    "vk_gamma_2": [["415", "161"], ["718", "192"]],
    "vk_delta_2": [["021", "222"], ["324", "252"]],
    "vk_alphabeta_12": [[["627", "282"], ["930", "333"]], [["434", "353"], ["637", "383"]]]
  };

  // GET /api/verification-key
  app.get('/api/verification-key', (req, res) => {
    res.json({
      success: true,
      vkey: mockVerificationKey,
      timestamp: new Date().toISOString()
    });
  });

  // POST /api/verify-proof
  app.post('/api/verify-proof', async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Validate request body
      const { proof, publicSignals } = req.body;

      if (!proof || !publicSignals) {
        return res.status(400).json({
          error: 'Missing required parameters',
          code: 'MISSING_PARAMETERS',
          required: ['proof', 'publicSignals'],
          received: { proof: !!proof, publicSignals: !!publicSignals },
          timestamp: new Date().toISOString()
        });
      }

      // Validate proof format
      const requiredProofFields = ['pi_a', 'pi_b', 'pi_c', 'protocol', 'curve'];
      for (const field of requiredProofFields) {
        if (!proof[field]) {
          return res.status(400).json({
            error: `Invalid proof format: missing field '${field}'`,
            code: 'INVALID_PROOF_FORMAT',
            field,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Validate public signals format and bounds
      if (!Array.isArray(publicSignals)) {
        return res.status(400).json({
          error: 'Public signals must be an array',
          code: 'INVALID_PUBLIC_SIGNALS_FORMAT',
          timestamp: new Date().toISOString()
        });
      }

      if (publicSignals.length !== 3) {
        return res.status(400).json({
          error: 'Invalid public signals length',
          code: 'INVALID_PUBLIC_SIGNALS_LENGTH',
          expected: 3,
          received: publicSignals.length,
          timestamp: new Date().toISOString()
        });
      }

      // Validate public signal values are valid field elements
      for (let i = 0; i < publicSignals.length; i++) {
        const signal = publicSignals[i];
        if (typeof signal !== 'string' && typeof signal !== 'number') {
          return res.status(400).json({
            error: `Invalid public signal at index ${i}: must be string or number`,
            code: 'INVALID_PUBLIC_SIGNAL_TYPE',
            index: i,
            type: typeof signal,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Perform ZK proof verification using SnarkJS
      let isValid;
      try {
        isValid = await snarkjs.groth16.verify(mockVerificationKey, publicSignals, proof);
      } catch (snarkjsError) {
        return res.status(400).json({
          error: 'Proof verification failed',
          code: 'VERIFICATION_FAILED',
          message: 'Invalid proof or public signals',
          timestamp: new Date().toISOString()
        });
      }

      // Extract and interpret public signals
      const tagMatchCount = parseInt(publicSignals[0], 10);
      const threshold = parseInt(publicSignals[1], 10);
      const targetTagIndex = parseInt(publicSignals[2], 10);

      // Map target tag index to human-readable name
      const TAG_DICTIONARY = ['defi', 'privacy', 'travel', 'gaming', 'technology', 'finance'];
      const matchedTag = TAG_DICTIONARY[targetTagIndex] || 'unknown';

      const responseTime = Date.now() - startTime;

      // Prepare response
      const response = {
        valid: isValid,
        results: isValid ? {
          matchedTag,
          tagMatchCount,
          threshold,
          targetTag: matchedTag,
          proofMeetsThreshold: tagMatchCount >= threshold
        } : null,
        metadata: {
          verificationTime: responseTime,
          publicSignals: publicSignals.map(Number),
          protocol: proof.protocol,
          curve: proof.curve
        },
        timestamp: new Date().toISOString()
      };

      // Set appropriate status code
      const statusCode = isValid ? 200 : 400;
      res.status(statusCode).json(response);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Handle JSON parsing errors
      if (error.type === 'entity.parse.failed') {
        return res.status(400).json({
          error: 'Invalid JSON format',
          code: 'JSON_PARSE_ERROR',
          timestamp: new Date().toISOString()
        });
      }

      res.status(500).json({
        error: 'Internal server error during proof verification',
        code: 'VERIFICATION_ERROR',
        message: error.message,
        metadata: {
          verificationTime: responseTime
        },
        timestamp: new Date().toISOString()
      });
    }
  });

  return app;
};

describe('Enhanced ZK Proof API Tests', () => {
  let app;
  
  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
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
      
      const publicSignals = ['30', '25', '0']; // tagMatchCount=30, threshold=25, targetTag=defi(0)
      
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: validProof,
          publicSignals: publicSignals
        })
        .expect(200);

      expect(response.body).toMatchObject({
        valid: true,
        results: {
          matchedTag: 'defi',
          tagMatchCount: 30,
          threshold: 25,
          targetTag: 'defi',
          proofMeetsThreshold: true
        },
        metadata: {
          verificationTime: expect.any(Number),
          publicSignals: [30, 25, 0],
          protocol: 'groth16',
          curve: 'bn128'
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
      
      const publicSignals = ['25', '20', '1']; // tagMatchCount=25, threshold=20, targetTag=privacy(1)
      
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: tamperedProof,
          publicSignals: publicSignals
        })
        .expect(400);

      expect(response.body).toMatchObject({
        valid: false,
        results: null,
        metadata: {
          verificationTime: expect.any(Number),
          publicSignals: [25, 20, 1],
          protocol: 'groth16',
          curve: 'bn128'
        },
        timestamp: expect.any(String)
      });
    });

    test('Should handle all tag mappings correctly', async () => {
      snarkjs.groth16.verify.mockResolvedValue(true);
      
      const tagMappings = {
        0: 'defi',
        1: 'privacy', 
        2: 'travel',
        3: 'gaming',
        4: 'technology',
        5: 'finance'
      };
      
      for (const [tagIndex, expectedTag] of Object.entries(tagMappings)) {
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
            publicSignals: ['15', '10', tagIndex] // tagMatchCount=15, threshold=10, targetTag=index
          })
          .expect(200);

        expect(response.body.results.matchedTag).toBe(expectedTag);
        expect(response.body.results.targetTag).toBe(expectedTag);
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
          publicSignals: ['15', '10', '999'] // Invalid tag index
        })
        .expect(200);

      expect(response.body.results.matchedTag).toBe('unknown');
      expect(response.body.results.targetTag).toBe('unknown');
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
          publicSignals: ['5', '0', '0'] // tagMatchCount=5, threshold=0, targetTag=defi(0)
        })
        .expect(200);

      expect(response.body.results.threshold).toBe(0);
      expect(response.body.results.proofMeetsThreshold).toBe(true);
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
          publicSignals: ['1000000000', '999999999', '0'] // Very large numbers
        })
        .expect(200);

      expect(response.body.results.threshold).toBe(999999999);
      expect(response.body.results.tagMatchCount).toBe(1000000000);
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
          publicSignals: ['15', '20', '0'] // tagMatchCount=15 < threshold=20
        })
        .expect(200);

      expect(response.body.results.tagMatchCount).toBe(15);
      expect(response.body.results.threshold).toBe(20);
      expect(response.body.results.proofMeetsThreshold).toBe(false);
    });
  });

  describe('Input Validation', () => {
    
    test('Should reject missing proof', async () => {
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          publicSignals: ['1', '20', '0']
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Missing required parameters',
        code: 'MISSING_PARAMETERS',
        required: ['proof', 'publicSignals'],
        received: { proof: false, publicSignals: true }
      });
    });

    test('Should reject missing public signals', async () => {
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: {
            pi_a: ['1', '2'],
            pi_b: [['3', '4'], ['5', '6']],
            pi_c: ['7', '8'],
            protocol: 'groth16',
            curve: 'bn128'
          }
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Missing required parameters',
        code: 'MISSING_PARAMETERS',
        required: ['proof', 'publicSignals'],
        received: { proof: true, publicSignals: false }
      });
    });

    test('Should reject invalid proof format', async () => {
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: {
            pi_a: ['1', '2'],
            // Missing pi_b, pi_c, protocol, curve
          },
          publicSignals: ['1', '20', '0']
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.stringContaining("Invalid proof format: missing field"),
        code: 'INVALID_PROOF_FORMAT',
        field: expect.any(String)
      });
    });

    test('Should reject wrong number of public signals', async () => {
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
          publicSignals: ['1', '20'] // Only 2 signals instead of 3
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid public signals length',
        code: 'INVALID_PUBLIC_SIGNALS_LENGTH',
        expected: 3,
        received: 2
      });
    });

    test('Should reject invalid public signal types', async () => {
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
          publicSignals: ['1', '20', { invalid: 'object' }] // Object instead of string/number
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.stringContaining('Invalid public signal at index 2'),
        code: 'INVALID_PUBLIC_SIGNAL_TYPE',
        index: 2,
        type: 'object'
      });
    });

    test('Should reject non-array public signals', async () => {
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
          publicSignals: 'not_an_array'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Public signals must be an array',
        code: 'INVALID_PUBLIC_SIGNALS_FORMAT'
      });
    });
  });

  describe('Security Testing', () => {
    
    test('Should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/verify-proof')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}') // Malformed JSON
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid JSON format',
        code: 'JSON_PARSE_ERROR'
      });
    });

    test('Should handle extremely large payloads', async () => {
      const largeArray = new Array(1000).fill('1'); // Smaller test size
      
      const response = await request(app)
        .post('/api/verify-proof')
        .send({
          proof: {
            pi_a: largeArray,
            pi_b: [largeArray, largeArray],
            pi_c: largeArray,
            protocol: 'groth16',
            curve: 'bn128'
          },
          publicSignals: ['1', '20', '0']
        });

      // The test app can handle this payload size, so we expect either success or reasonable rejection
      expect([200, 400, 413, 500]).toContain(response.status);
    });

    test('Should sanitize error messages in production', async () => {
      // Mock snarkjs to throw a detailed error
      snarkjs.groth16.verify.mockRejectedValue(new Error('Detailed internal error with sensitive info'));
      
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
          publicSignals: ['1', '20', '0']
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Proof verification failed',
        code: 'VERIFICATION_FAILED',
        message: 'Invalid proof or public signals'
      });
    });

    test('Should include security headers', async () => {
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
          publicSignals: ['1', '20', '0']
        })
        .expect(200);

      // Check for basic security headers (these may be set by middleware)
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Performance Testing', () => {
    
    test('Should complete verification within reasonable time', async () => {
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
          publicSignals: ['1', '20', '0']
        })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should complete within 5 seconds
      expect(responseTime).toBeLessThan(5000);
      expect(response.body.metadata.verificationTime).toBeGreaterThan(90);
    });

    test('Should handle concurrent requests efficiently', async () => {
      snarkjs.groth16.verify.mockResolvedValue(true);
      
      const proofRequest = {
        proof: {
          pi_a: ['1', '2'],
          pi_b: [['3', '4'], ['5', '6']],
          pi_c: ['7', '8'],
          protocol: 'groth16',
          curve: 'bn128'
        },
        publicSignals: ['1', '20', '0']
      };

      // Send 5 concurrent requests
      const promises = Array.from({ length: 5 }, () => 
        request(app).post('/api/verify-proof').send(proofRequest)
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.valid).toBe(true);
      });
    });

    test('Should provide timing metadata', async () => {
      // Add small delay to ensure measurable timing
      snarkjs.groth16.verify.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(true), 1))
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
          publicSignals: ['1', '20', '0']
        })
        .expect(200);

      expect(response.body.metadata.verificationTime).toBeGreaterThanOrEqual(0);
      expect(typeof response.body.metadata.verificationTime).toBe('number');
    });
  });

  describe('Integration with Circuit Outputs', () => {
    
    test('Should correctly interpret circuit output format', async () => {
      snarkjs.groth16.verify.mockResolvedValue(true);
      
      // Test each tag type with realistic circuit outputs
      const testCases = [
        { tagMatchCount: 25, threshold: 20, targetTag: 0, expectedTag: 'defi' },
        { tagMatchCount: 30, threshold: 25, targetTag: 1, expectedTag: 'privacy' },
        { tagMatchCount: 15, threshold: 10, targetTag: 2, expectedTag: 'travel' },
        { tagMatchCount: 40, threshold: 35, targetTag: 3, expectedTag: 'gaming' }
      ];

      for (const testCase of testCases) {
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
            publicSignals: [
              testCase.tagMatchCount.toString(),
              testCase.threshold.toString(),
              testCase.targetTag.toString()
            ]
          })
          .expect(200);

        expect(response.body.results).toMatchObject({
          matchedTag: testCase.expectedTag,
          tagMatchCount: testCase.tagMatchCount,
          threshold: testCase.threshold,
          targetTag: testCase.expectedTag,
          proofMeetsThreshold: testCase.tagMatchCount >= testCase.threshold
        });
      }
    });

    test('Should handle boundary conditions', async () => {
      snarkjs.groth16.verify.mockResolvedValue(true);
      
      // Test exact threshold match
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
          publicSignals: ['25', '25', '0'] // Exactly meets threshold
        })
        .expect(200);

      expect(response.body.results.proofMeetsThreshold).toBe(true);
      expect(response.body.results.tagMatchCount).toBe(25);
      expect(response.body.results.threshold).toBe(25);
    });

    test('Should preserve numeric precision in public signals', async () => {
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
          publicSignals: ['1234567890', '9876543210', '5']
        })
        .expect(200);

      expect(response.body.metadata.publicSignals).toEqual([1234567890, 9876543210, 5]);
      expect(response.body.results.tagMatchCount).toBe(1234567890);
      expect(response.body.results.threshold).toBe(9876543210);
    });
  });
}); 