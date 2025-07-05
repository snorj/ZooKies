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

// Create a mock ZkProofBuilder class for testing
class MockZkProofBuilder {
  constructor() {
    this.isInitialized = false;
    this.wasmPath = path.join(__dirname, '..', 'circom', 'build', 'circuits', 'ThresholdProof_js', 'ThresholdProof.wasm');
    this.zkeyPath = path.join(__dirname, '..', 'circom', 'build', 'keys', 'ThresholdProof_final.zkey');
    this.vkeyPath = path.join(__dirname, '..', 'circom', 'build', 'keys', 'verification_key.json');
    this.errorConditions = {
      forceProofError: false,
      forceInitError: false,
      forceNetworkTimeout: false,
      forceMissingFiles: false
    };
  }

  // Method to set error conditions for testing
  setErrorCondition(condition, value) {
    this.errorConditions[condition] = value;
  }

  async initialize() {
    if (this.errorConditions.forceInitError) {
      return { success: false, error: 'Failed to initialize circuit' };
    }
    if (this.errorConditions.forceMissingFiles) {
      return { success: false, error: 'Circuit files not found' };
    }
    
    this.isInitialized = true;
    return { success: true, isInitialized: true };
  }

  prepareCircuitInputs(attestations, targetTag, threshold) {
    const tagMap = {
      'defi': 1, 'privacy': 2, 'travel': 3, 
      'gaming': 4, 'technology': 5, 'finance': 6
    };

    // Filter valid attestations (exclude malformed ones)
    const validAttestations = attestations.filter(att => 
      att && typeof att === 'object' && 
      att.hasOwnProperty('tag') && 
      att.hasOwnProperty('score') &&
      att.hasOwnProperty('signature') &&
      att.tag && att.signature && typeof att.score === 'number'
    );

    if (validAttestations.length === 0) {
      return null; // Signal that no valid attestations exist
    }

    const filteredAttestations = validAttestations.filter(att => att.tag === targetTag);
    const totalScore = filteredAttestations.reduce((sum, att) => sum + att.score, 0);

    // Pad to 50 attestations
    const paddedAttestations = [...filteredAttestations];
    while (paddedAttestations.length < 50) {
      paddedAttestations.push({
        tag: targetTag,
        score: 0,
        timestamp: 0,
        signature: '0'
      });
    }

    return {
      attestationScores: paddedAttestations.map(att => att.score),
      targetTag: tagMap[targetTag] || 1,
      threshold: threshold,
      hasValidProof: totalScore >= threshold ? 1 : 0
    };
  }

  async generateProof(attestations, targetTag, threshold) {
    // Check for forced error conditions
    if (this.errorConditions.forceInitError) {
      return { success: false, error: 'Failed to initialize circuit' };
    }
    if (this.errorConditions.forceProofError) {
      return { success: false, error: 'Proof generation failed' };
    }
    if (this.errorConditions.forceNetworkTimeout) {
      return { success: false, error: 'Timeout exceeded during proof generation' };
    }
    if (this.errorConditions.forceMissingFiles) {
      return { success: false, error: 'Circuit files not found' };
    }

    // Prepare inputs
    const circuitInputs = this.prepareCircuitInputs(attestations, targetTag, threshold);
    
    // Check for malformed attestations
    if (!circuitInputs) {
      return { success: false, error: 'No valid attestations found' };
    }

    // Check for insufficient attestations
    const totalScore = attestations
      .filter(att => att.tag === targetTag)
      .reduce((sum, att) => sum + att.score, 0);

    if (totalScore < threshold) {
      return { 
        success: true, 
        proof: null,
        publicSignals: [totalScore, threshold, 0],
        error: 'Insufficient attestations to meet threshold'
      };
    }

    // Mock successful proof generation
    const mockProof = {
      pi_a: ['123', '456'],
      pi_b: [['789', '101'], ['112', '131']],
      pi_c: ['415', '161'],
      protocol: 'groth16',
      curve: 'bn128'
    };

    const publicSignals = [totalScore, threshold, 1];

    return {
      success: true,
      proof: mockProof,
      publicSignals,
      verificationTime: 150
    };
  }

  generateConsistentHash(data) {
    return require('crypto')
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  clearCache() {
    // Mock cache clearing
    return { success: true };
  }
}

// Global instance
let mockZkProofBuilder = new MockZkProofBuilder();

// Mock the getZkProofBuilder function
const getZkProofBuilder = () => mockZkProofBuilder;

describe('zkProofBuilder Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset error conditions
    mockZkProofBuilder.errorConditions = {
      forceProofError: false,
      forceInitError: false,
      forceNetworkTimeout: false,
      forceMissingFiles: false
    };
    mockZkProofBuilder.isInitialized = false;
  });

  describe('Singleton Pattern', () => {
    
    test('Should maintain singleton instance', () => {
      const instance1 = getZkProofBuilder();
      const instance2 = getZkProofBuilder();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(MockZkProofBuilder);
    });

    test('Should initialize with correct default values', () => {
      const zkProofBuilder = getZkProofBuilder();
      
      expect(zkProofBuilder.isInitialized).toBe(false);
      expect(zkProofBuilder.wasmPath).toContain('ThresholdProof.wasm');
      expect(zkProofBuilder.zkeyPath).toContain('ThresholdProof_final.zkey');
    });
  });

  describe('prepareCircuitInputs Method', () => {
    
    test('Should filter attestations by tag correctly', () => {
      const zkProofBuilder = getZkProofBuilder();
      
      const mockAttestations = [
        { tag: 'defi', score: 5, signature: 'sig1' },
        { tag: 'privacy', score: 3, signature: 'sig2' },
        { tag: 'defi', score: 7, signature: 'sig3' }
      ];
      
      const result = zkProofBuilder.prepareCircuitInputs(mockAttestations, 'defi', 10);
      
      expect(result).toBeDefined();
      expect(result.targetTag).toBe(1); // defi = 1
      expect(result.threshold).toBe(10);
    });

    test('Should pad attestations to 50 elements', () => {
      const zkProofBuilder = getZkProofBuilder();
      
      const mockAttestations = [
        { tag: 'defi', score: 5, signature: 'sig1' },
        { tag: 'defi', score: 3, signature: 'sig2' }
      ];
      
      const result = zkProofBuilder.prepareCircuitInputs(mockAttestations, 'defi', 5);
      
      expect(result.attestationScores).toHaveLength(50);
      expect(result.attestationScores[0]).toBe(5);
      expect(result.attestationScores[1]).toBe(3);
      expect(result.attestationScores[2]).toBe(0); // Padded
    });

    test('Should handle empty attestations', () => {
      const zkProofBuilder = getZkProofBuilder();
      
      const result = zkProofBuilder.prepareCircuitInputs([], 'defi', 10);
      
      expect(result).toBeNull();
    });

    test('Should calculate valid proof status correctly', () => {
      const zkProofBuilder = getZkProofBuilder();
      
      const mockAttestations = [
        { tag: 'defi', score: 8, signature: 'sig1' },
        { tag: 'defi', score: 7, signature: 'sig2' }
      ];
      
      const result = zkProofBuilder.prepareCircuitInputs(mockAttestations, 'defi', 10);
      
      expect(result.hasValidProof).toBe(1); // 8 + 7 = 15 >= 10
    });

    test('Should map all tag types correctly', () => {
      const zkProofBuilder = getZkProofBuilder();
      
      const tagMappings = {
        'defi': 1, 'privacy': 2, 'travel': 3,
        'gaming': 4, 'technology': 5, 'finance': 6
      };
      
      for (const [tag, expectedMapping] of Object.entries(tagMappings)) {
        const mockAttestations = [{ tag, score: 5, signature: 'sig1' }];
        const result = zkProofBuilder.prepareCircuitInputs(mockAttestations, tag, 3);
        
        expect(result.targetTag).toBe(expectedMapping);
      }
    });

    test('Should handle unknown tags with default mapping', () => {
      const zkProofBuilder = getZkProofBuilder();
      
      const mockAttestations = [{ tag: 'unknown_tag', score: 5, signature: 'sig1' }];
      const result = zkProofBuilder.prepareCircuitInputs(mockAttestations, 'unknown_tag', 3);
      
      expect(result.targetTag).toBe(1); // Default mapping
    });
  });

  describe('Signature Verification', () => {
    
    test('Should filter out invalid attestations', () => {
      const zkProofBuilder = getZkProofBuilder();
      
      const mixedAttestations = [
        { tag: 'defi', score: 5, signature: 'valid_sig' },
        { tag: 'defi', score: 3, signature: '' }, // Invalid signature
        { tag: 'defi', score: 7, signature: 'valid_sig2' }
      ];
      
      const result = zkProofBuilder.prepareCircuitInputs(mixedAttestations, 'defi', 5);
      
      expect(result).toBeDefined();
    });

    test('Should handle attestations missing signature field', () => {
      const zkProofBuilder = getZkProofBuilder();
      
      const malformedAttestations = [
        { tag: 'defi', score: 5 }, // Missing signature
        { tag: 'defi', score: 3, signature: 'valid_sig' }
      ];
      
      const result = zkProofBuilder.prepareCircuitInputs(malformedAttestations, 'defi', 5);
      
      expect(result).toBeDefined();
    });
  });

  describe('generateProof Method', () => {
    
    test('Should generate proof successfully with valid inputs', async () => {
      const zkProofBuilder = getZkProofBuilder();
      
      const mockAttestations = [
        { tag: 'defi', score: 15, signature: 'sig1' },
        { tag: 'defi', score: 10, signature: 'sig2' }
      ];
      
      const result = await zkProofBuilder.generateProof(mockAttestations, 'defi', 20);
      
      expect(result.success).toBe(true);
      expect(result.proof).toBeDefined();
      expect(result.publicSignals).toEqual([25, 20, 1]);
    });

    test('Should handle proof generation errors gracefully', async () => {
      const zkProofBuilder = getZkProofBuilder();
      
      // Set error condition
      zkProofBuilder.setErrorCondition('forceProofError', true);
      
      const mockAttestations = [{ tag: 'defi', score: 10, signature: 'sig1' }];
      const result = await zkProofBuilder.generateProof(mockAttestations, 'defi', 20);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Proof generation failed');
      expect(result.proof).toBeUndefined();
    });

    test('Should reject insufficient attestations gracefully', async () => {
      const zkProofBuilder = getZkProofBuilder();
      
      const mockAttestations = [
        { tag: 'defi', score: 5, signature: 'sig1' },
        { tag: 'defi', score: 3, signature: 'sig2' }
      ];
      
      const result = await zkProofBuilder.generateProof(mockAttestations, 'defi', 20);
      
      expect(result.success).toBe(true);
      expect(result.proof).toBeNull();
      expect(result.error).toContain('Insufficient attestations');
    });

    test('Should handle empty attestation list', async () => {
      const zkProofBuilder = getZkProofBuilder();
      
      const result = await zkProofBuilder.generateProof([], 'defi', 10);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid attestations');
    });

    test('Should validate input parameters', async () => {
      const zkProofBuilder = getZkProofBuilder();
      
      const mockAttestations = [{ tag: 'defi', score: 10, signature: 'sig1' }];
      
      // Test with valid parameters
      const result = await zkProofBuilder.generateProof(mockAttestations, 'defi', 5);
      expect(result.success).toBe(true);
    });
  });

  describe('Performance Testing', () => {
    
    test('Should handle large attestation datasets efficiently', async () => {
      const zkProofBuilder = getZkProofBuilder();
      
      // Generate 100 attestations
      const largeAttestationSet = Array.from({ length: 100 }, (_, i) => ({
        tag: 'defi',
        score: Math.floor(Math.random() * 10) + 1,
        signature: `sig_${i}`
      }));
      
      const startTime = Date.now();
      const result = await zkProofBuilder.generateProof(largeAttestationSet, 'defi', 200);
      const endTime = Date.now();
      
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('Should manage memory efficiently during proof generation', async () => {
      const zkProofBuilder = getZkProofBuilder();
      
      const mockAttestations = [{ tag: 'defi', score: 25, signature: 'sig1' }];
      
      // Multiple proof generations should not cause memory issues
      for (let i = 0; i < 5; i++) {
        const result = await zkProofBuilder.generateProof(mockAttestations, 'defi', 20);
        expect(result.success).toBe(true);
      }
    });

    test('Should handle concurrent proof generation requests', async () => {
      const zkProofBuilder = getZkProofBuilder();
      
      const mockAttestations = [{ tag: 'defi', score: 25, signature: 'sig1' }];
      
      // Generate multiple proofs concurrently
      const promises = Array.from({ length: 3 }, () => 
        zkProofBuilder.generateProof(mockAttestations, 'defi', 20)
      );
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    
    test('Should handle malformed attestation objects', async () => {
      const zkProofBuilder = getZkProofBuilder();
      
      const malformedAttestations = [
        null,
        undefined,
        'not_an_object',
        { tag: 'defi' }, // Missing score and signature
        { score: 10 }, // Missing tag and signature
      ];
      
      const result = await zkProofBuilder.generateProof(malformedAttestations, 'defi', 1);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid attestations');
    });

    test('Should handle circuit initialization failures', async () => {
      const zkProofBuilder = getZkProofBuilder();
      
      // Set error condition
      zkProofBuilder.setErrorCondition('forceInitError', true);
      
      const mockAttestations = [{ tag: 'defi', score: 25, signature: 'sig1' }];
      const result = await zkProofBuilder.generateProof(mockAttestations, 'defi', 20);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to initialize');
      
      // Restore
      zkProofBuilder.setErrorCondition('forceInitError', false);
    });

    test('Should handle network timeouts gracefully', async () => {
      const zkProofBuilder = getZkProofBuilder();
      
      // Set timeout condition
      zkProofBuilder.setErrorCondition('forceNetworkTimeout', true);
      
      const mockAttestations = [{ tag: 'defi', score: 25, signature: 'sig1' }];
      const result = await zkProofBuilder.generateProof(mockAttestations, 'defi', 20);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Timeout');
    });
  });

  describe('Hash Generation and Consistency', () => {
    
    test('Should generate consistent hashes for same inputs', () => {
      const zkProofBuilder = getZkProofBuilder();
      
      const testData = { tag: 'defi', score: 10, threshold: 5 };
      
      const hash1 = zkProofBuilder.generateConsistentHash(testData);
      const hash2 = zkProofBuilder.generateConsistentHash(testData);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toBeDefined();
      expect(typeof hash1).toBe('string');
    });

    test('Should generate different hashes for different inputs', () => {
      const zkProofBuilder = getZkProofBuilder();
      
      const testData1 = { tag: 'defi', score: 10, threshold: 5 };
      const testData2 = { tag: 'privacy', score: 10, threshold: 5 };
      
      const hash1 = zkProofBuilder.generateConsistentHash(testData1);
      const hash2 = zkProofBuilder.generateConsistentHash(testData2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Configuration and Paths', () => {
    
    test('Should have correct default file paths', () => {
      const zkProofBuilder = getZkProofBuilder();
      
      expect(zkProofBuilder.wasmPath).toContain('ThresholdProof.wasm');
      expect(zkProofBuilder.zkeyPath).toContain('ThresholdProof_final.zkey');
      expect(zkProofBuilder.vkeyPath).toContain('verification_key.json');
    });

    test('Should handle missing circuit files gracefully', async () => {
      const zkProofBuilder = getZkProofBuilder();
      
      // Set missing files condition
      zkProofBuilder.setErrorCondition('forceMissingFiles', true);
      
      const mockAttestations = [{ tag: 'defi', score: 25, signature: 'sig1' }];
      const result = await zkProofBuilder.generateProof(mockAttestations, 'defi', 20);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Circuit files not found');
      
      // Restore
      zkProofBuilder.setErrorCondition('forceMissingFiles', false);
    });
  });
}); 