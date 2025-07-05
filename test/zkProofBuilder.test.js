/**
 * zkProofBuilder Tests
 * Comprehensive testing for ZK proof generation, attestation handling, and performance
 */

const path = require('path');
const fs = require('fs');

// Mock browser environment for IndexedDB
Object.defineProperty(global, 'window', {
  value: {
    location: { href: 'http://localhost:3000' },
    indexedDB: {},
    crypto: { getRandomValues: (arr) => require('crypto').randomFillSync(arr) }
  },
  writable: true
});

// Mock snarkjs for testing
jest.mock('snarkjs', () => ({
  groth16: {
    fullProve: jest.fn(),
    verify: jest.fn()
  }
}));

const snarkjs = require('snarkjs');

// Import the zkProofBuilder
const zkProofBuilderPath = path.join(__dirname, '..', 'shared', 'zkProofBuilder.js');
const zkProofBuilderCode = fs.readFileSync(zkProofBuilderPath, 'utf8');

// Execute the code to get the class
eval(zkProofBuilderCode);

describe('zkProofBuilder Tests', () => {
  let zkProofBuilder;
  let mockAttestations;

  beforeEach(() => {
    // Reset singleton
    if (global.zkProofBuilderInstance) {
      delete global.zkProofBuilderInstance;
    }
    
    zkProofBuilder = new ZKProofBuilder();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock attestations
    mockAttestations = [
      {
        id: 'att_1',
        tag: 'defi',
        score: 8,
        timestamp: Date.now() - 1000,
        signature: 'valid_signature_1',
        walletAddress: '0x123',
        isValid: true
      },
      {
        id: 'att_2', 
        tag: 'defi',
        score: 7,
        timestamp: Date.now() - 2000,
        signature: 'valid_signature_2',
        walletAddress: '0x123',
        isValid: true
      },
      {
        id: 'att_3',
        tag: 'privacy',
        score: 6,
        timestamp: Date.now() - 3000,
        signature: 'valid_signature_3',
        walletAddress: '0x123',
        isValid: true
      },
      {
        id: 'att_4',
        tag: 'defi',
        score: 9,
        timestamp: Date.now() - 4000,
        signature: 'valid_signature_4',
        walletAddress: '0x123',
        isValid: true
      }
    ];
  });

  describe('Singleton Pattern', () => {
    
    test('Should maintain singleton instance', () => {
      const instance1 = new ZKProofBuilder();
      const instance2 = new ZKProofBuilder();
      
      expect(instance1).toBe(instance2);
    });

    test('Should initialize with correct default values', () => {
      expect(zkProofBuilder.isInitialized).toBe(false);
      expect(zkProofBuilder.wasmPath).toContain('ThresholdProof.wasm');
      expect(zkProofBuilder.zkeyPath).toContain('ThresholdProof_final.zkey');
    });
  });

  describe('prepareCircuitInputs Method', () => {
    
    test('Should filter attestations by tag correctly', async () => {
      const inputs = await zkProofBuilder.prepareCircuitInputs(mockAttestations, 'defi', 20);
      
      // Should have 3 defi attestations with scores 8, 7, 9
      const nonZeroScores = inputs.attestationScores.filter(score => score > 0);
      expect(nonZeroScores).toEqual([8, 7, 9]);
      expect(inputs.targetTag).toBe(1); // defi = 1
      expect(inputs.threshold).toBe(20);
      expect(inputs.totalScore).toBe(24); // 8 + 7 + 9
    });

    test('Should pad attestations to 50 elements', async () => {
      const inputs = await zkProofBuilder.prepareCircuitInputs(mockAttestations, 'privacy', 10);
      
      expect(inputs.attestationScores).toHaveLength(50);
      // First element should be the privacy attestation (score 6)
      expect(inputs.attestationScores[0]).toBe(6);
      // Remaining should be zeros
      expect(inputs.attestationScores.slice(1).every(score => score === 0)).toBe(true);
    });

    test('Should handle empty attestations', async () => {
      const inputs = await zkProofBuilder.prepareCircuitInputs([], 'defi', 10);
      
      expect(inputs.attestationScores).toHaveLength(50);
      expect(inputs.attestationScores.every(score => score === 0)).toBe(true);
      expect(inputs.totalScore).toBe(0);
      expect(inputs.hasValidProof).toBe(0);
    });

    test('Should calculate valid proof status correctly', async () => {
      // Test with sufficient score
      let inputs = await zkProofBuilder.prepareCircuitInputs(mockAttestations, 'defi', 20);
      expect(inputs.hasValidProof).toBe(1); // 24 >= 20
      
      // Test with insufficient score
      inputs = await zkProofBuilder.prepareCircuitInputs(mockAttestations, 'defi', 30);
      expect(inputs.hasValidProof).toBe(0); // 24 < 30
    });

    test('Should map all tag types correctly', async () => {
      const tagMappings = {
        'defi': 1,
        'privacy': 2,
        'travel': 3,
        'gaming': 4,
        'technology': 5,
        'finance': 6
      };

      for (const [tag, expectedId] of Object.entries(tagMappings)) {
        const testAtt = [{ tag, score: 5, signature: 'test', isValid: true }];
        const inputs = await zkProofBuilder.prepareCircuitInputs(testAtt, tag, 1);
        expect(inputs.targetTag).toBe(expectedId);
      }
    });

    test('Should handle unknown tags with default mapping', async () => {
      const unknownTagAtt = [{ tag: 'unknown', score: 5, signature: 'test', isValid: true }];
      const inputs = await zkProofBuilder.prepareCircuitInputs(unknownTagAtt, 'unknown', 1);
      expect(inputs.targetTag).toBe(1); // Default to defi
    });
  });

  describe('Signature Verification', () => {
    
    test('Should filter out invalid attestations', async () => {
      const invalidAttestations = [
        ...mockAttestations,
        {
          id: 'invalid_1',
          tag: 'defi',
          score: 10,
          signature: 'invalid_signature',
          isValid: false // Invalid attestation
        }
      ];

      const inputs = await zkProofBuilder.prepareCircuitInputs(invalidAttestations, 'defi', 20);
      
      // Should still have only 3 valid defi attestations
      const nonZeroScores = inputs.attestationScores.filter(score => score > 0);
      expect(nonZeroScores).toEqual([8, 7, 9]);
      expect(inputs.totalScore).toBe(24);
    });

    test('Should handle attestations missing signature field', async () => {
      const malformedAttestations = [
        { tag: 'defi', score: 5 }, // No signature field
        { tag: 'defi', score: 7, signature: null }, // Null signature
        { tag: 'defi', score: 8, signature: 'valid', isValid: true }
      ];

      const inputs = await zkProofBuilder.prepareCircuitInputs(malformedAttestations, 'defi', 1);
      
      // Should only include the valid one
      const nonZeroScores = inputs.attestationScores.filter(score => score > 0);
      expect(nonZeroScores).toEqual([8]);
    });
  });

  describe('generateProof Method', () => {
    
    beforeEach(() => {
      // Mock successful proof generation
      snarkjs.groth16.fullProve.mockResolvedValue({
        proof: {
          pi_a: ['1', '2'],
          pi_b: [['3', '4'], ['5', '6']],
          pi_c: ['7', '8'],
          protocol: 'groth16',
          curve: 'bn128'
        },
        publicSignals: ['1', '20', '24', '1']
      });
    });

    test('Should generate proof successfully with valid inputs', async () => {
      const result = await zkProofBuilder.generateProof(mockAttestations, 'defi', 20);
      
      expect(result.success).toBe(true);
      expect(result.proof).toBeDefined();
      expect(result.publicSignals).toBeDefined();
      expect(result.metadata).toMatchObject({
        tag: 'defi',
        threshold: 20,
        totalScore: 24,
        attestationCount: 3,
        timestamp: expect.any(String)
      });
    });

    test('Should handle proof generation errors gracefully', async () => {
      snarkjs.groth16.fullProve.mockRejectedValue(new Error('Proof generation failed'));
      
      const result = await zkProofBuilder.generateProof(mockAttestations, 'defi', 20);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Proof generation failed');
      expect(result.proof).toBeUndefined();
    });

    test('Should reject insufficient attestations gracefully', async () => {
      const result = await zkProofBuilder.generateProof(mockAttestations, 'defi', 100);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient attestations');
      expect(result.metadata.totalScore).toBe(24);
      expect(result.metadata.threshold).toBe(100);
    });

    test('Should handle empty attestation list', async () => {
      const result = await zkProofBuilder.generateProof([], 'defi', 10);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid attestations');
    });

    test('Should validate input parameters', async () => {
      // Test null attestations
      let result = await zkProofBuilder.generateProof(null, 'defi', 10);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid parameters');

      // Test invalid tag
      result = await zkProofBuilder.generateProof(mockAttestations, '', 10);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid parameters');

      // Test negative threshold
      result = await zkProofBuilder.generateProof(mockAttestations, 'defi', -1);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid parameters');
    });
  });

  describe('Performance Testing', () => {
    
    test('Should handle large attestation datasets efficiently', async () => {
      // Generate 100 attestations
      const largeAttestationSet = Array.from({ length: 100 }, (_, i) => ({
        id: `att_${i}`,
        tag: 'defi',
        score: Math.floor(Math.random() * 10) + 1,
        timestamp: Date.now() - i * 1000,
        signature: `sig_${i}`,
        isValid: true
      }));

      const startTime = Date.now();
      const inputs = await zkProofBuilder.prepareCircuitInputs(largeAttestationSet, 'defi', 100);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(inputs.attestationScores).toHaveLength(50); // Still padded to 50
    });

    test('Should manage memory efficiently during proof generation', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Run multiple proof operations
      for (let i = 0; i < 5; i++) {
        await zkProofBuilder.generateProof(mockAttestations, 'defi', 20);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test('Should handle concurrent proof generation requests', async () => {
      const concurrentProofs = [];
      
      // Start 3 concurrent proof generations
      for (let i = 0; i < 3; i++) {
        const promise = zkProofBuilder.generateProof(mockAttestations, 'defi', 20);
        concurrentProofs.push(promise);
      }
      
      const results = await Promise.all(concurrentProofs);
      
      // All should succeed or fail consistently
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(0); // At least some should succeed
    });
  });

  describe('Error Handling and Edge Cases', () => {
    
    test('Should handle malformed attestation objects', async () => {
      const malformedAttestations = [
        null,
        undefined,
        {},
        { tag: 'defi' }, // Missing score
        { score: 5 }, // Missing tag
        'invalid_string',
        { tag: 'defi', score: 'invalid_score', signature: 'test' }
      ];

      const result = await zkProofBuilder.generateProof(malformedAttestations, 'defi', 1);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid attestations');
    });

    test('Should handle circuit initialization failures', async () => {
      // Mock initialization failure
      const originalInit = zkProofBuilder.initialize;
      zkProofBuilder.initialize = jest.fn().mockRejectedValue(new Error('Init failed'));
      
      const result = await zkProofBuilder.generateProof(mockAttestations, 'defi', 20);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to initialize');
      
      // Restore
      zkProofBuilder.initialize = originalInit;
    });

    test('Should handle network timeouts gracefully', async () => {
      // Mock timeout scenario
      snarkjs.groth16.fullProve.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const result = await zkProofBuilder.generateProof(mockAttestations, 'defi', 20);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Timeout');
    });
  });

  describe('Hash Generation and Consistency', () => {
    
    test('Should generate consistent hashes for same inputs', async () => {
      const inputs1 = await zkProofBuilder.prepareCircuitInputs(mockAttestations, 'defi', 20);
      const inputs2 = await zkProofBuilder.prepareCircuitInputs(mockAttestations, 'defi', 20);
      
      expect(inputs1.attestationScores).toEqual(inputs2.attestationScores);
      expect(inputs1.targetTag).toBe(inputs2.targetTag);
      expect(inputs1.threshold).toBe(inputs2.threshold);
      expect(inputs1.totalScore).toBe(inputs2.totalScore);
    });

    test('Should generate different hashes for different inputs', async () => {
      const inputs1 = await zkProofBuilder.prepareCircuitInputs(mockAttestations, 'defi', 20);
      const inputs2 = await zkProofBuilder.prepareCircuitInputs(mockAttestations, 'privacy', 20);
      
      expect(inputs1.targetTag).not.toBe(inputs2.targetTag);
      expect(inputs1.totalScore).not.toBe(inputs2.totalScore);
    });
  });

  describe('Configuration and Paths', () => {
    
    test('Should have correct default file paths', () => {
      expect(zkProofBuilder.wasmPath).toMatch(/ThresholdProof\.wasm$/);
      expect(zkProofBuilder.zkeyPath).toMatch(/ThresholdProof_final\.zkey$/);
    });

    test('Should handle missing circuit files gracefully', async () => {
      // Mock file not found
      const originalInit = zkProofBuilder.initialize;
      zkProofBuilder.initialize = jest.fn().mockRejectedValue(new Error('ENOENT: no such file'));
      
      const result = await zkProofBuilder.generateProof(mockAttestations, 'defi', 20);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Circuit files not found');
      
      // Restore
      zkProofBuilder.initialize = originalInit;
    });
  });
});

module.exports = {
  ZKProofBuilder
}; 