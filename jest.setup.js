// Jest setup file for ZooKies E2E tests

// Note: In ES modules mode, jest globals are available differently
// We'll handle timeouts in individual test files as needed

// Suppress console warnings during tests
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && args[0].includes && args[0].includes('source-map')) {
    return;
  }
  originalConsoleWarn(...args);
};

// Global test configuration
globalThis.testConfig = {
  headless: process.env.TEST_HEADLESS !== 'false',
  slowMo: process.env.TEST_SLOW_MO ? parseInt(process.env.TEST_SLOW_MO) : 0
};

// Mock ES modules that cause Jest issues
jest.mock('./shared/database.js', () => {
  class MockDatabaseError extends Error {
    constructor(message) {
      super(message);
      this.name = 'DatabaseError';
    }
  }

  class MockValidationError extends MockDatabaseError {
    constructor(message) {
      super(message);
      this.name = 'ValidationError';
    }
  }

  class MockDatabaseManager {
    constructor() {
      this.db = null;
      this.initialized = false;
    }

    async initializeDatabase() {
      this.initialized = true;
      return Promise.resolve();
    }

    async connect() {
      return Promise.resolve();
    }

    async storeAttestation(attestation) {
      return Promise.resolve(Math.floor(Math.random() * 1000));
    }

    async getAttestations(walletAddress, tag = null) {
      return Promise.resolve([]);
    }

    async getUserProfile(walletAddress) {
      return Promise.resolve({
        wallet: walletAddress,
        created_at: Date.now(),
        last_updated: Date.now()
      });
    }

    async close() {
      return Promise.resolve();
    }
  }

  return {
    DatabaseManager: MockDatabaseManager,
    DatabaseError: MockDatabaseError,
    ValidationError: MockValidationError
  };
});

jest.mock('./shared/cryptography.js', () => {
  class MockSignatureVerificationError extends Error {
    constructor(message) {
      super(message);
      this.name = 'SignatureVerificationError';
    }
  }

  class MockPublisherSigner {
    static verifyAttestation(attestation) {
      return { valid: true, publisher: 'mock-publisher' };
    }
  }

  return {
    PublisherSigner: MockPublisherSigner,
    SignatureVerificationError: MockSignatureVerificationError
  };
});

jest.mock('./shared/publisher-keys.js', () => ({
  PUBLISHER_KEYS: {
    'mock-publisher': {
      publicKey: 'mock-public-key',
      name: 'Mock Publisher'
    }
  }
}));

// Mock zkProofBuilder for tests
jest.mock('./shared/zkProofBuilder.js', () => {
  class MockZKProofBuilder {
    constructor() {
      this.initialized = false;
      this.circuitWasm = null;
      this.circuitZkey = null;
    }

    static getInstance() {
      if (!MockZKProofBuilder.instance) {
        MockZKProofBuilder.instance = new MockZKProofBuilder();
      }
      return MockZKProofBuilder.instance;
    }

    async initialize() {
      this.initialized = true;
      return Promise.resolve();
    }

    prepareCircuitInputs(attestations, threshold, tag) {
      return {
        threshold: [threshold],
        tag_hash: [123456],
        attestations: Array(50).fill([0, 0, 0]),
        valid_count: [Math.min(attestations.length, 50)]
      };
    }

    async generateProof(attestations, threshold, tag) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate computation
      return {
        proof: {
          pi_a: ["0x1", "0x2"],
          pi_b: [["0x3", "0x4"], ["0x5", "0x6"]],
          pi_c: ["0x7", "0x8"]
        },
        publicSignals: [1, 123456]
      };
    }
  }

  return { ZKProofBuilder: MockZKProofBuilder };
});

// Mock snarkjs for circuit tests
jest.mock('snarkjs', () => ({
  groth16: {
    fullProve: jest.fn().mockResolvedValue({
      proof: {
        pi_a: ["0x1", "0x2"],
        pi_b: [["0x3", "0x4"], ["0x5", "0x6"]],
        pi_c: ["0x7", "0x8"]
      },
      publicSignals: ["1", "123456"]
    }),
    verify: jest.fn().mockResolvedValue(true)
  },
  zKey: {
    exportVerificationKey: jest.fn().mockResolvedValue({
      protocol: "groth16",
      curve: "bn128"
    })
  }
})); 