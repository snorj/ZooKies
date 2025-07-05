console.log('🟢 TEST: Minimal zkProofBuilder test file loading...');

// Add the constants from zkProofBuilder.js
const TAG_DICTIONARY = {
    defi: 0,
    privacy: 1, 
    travel: 2,
    gaming: 3,
    technology: 4,
    finance: 5
};

const TAG_INDEX_TO_STRING = Object.fromEntries(
    Object.entries(TAG_DICTIONARY).map(([key, value]) => [value, key])
);

const CIRCUIT_PATHS = {
    wasm: '/circom/build/circuits/ThresholdProof_js/ThresholdProof.wasm',
    zkey: '/circom/build/keys/ThresholdProof_final.zkey',
    verificationKey: '/circom/build/keys/verification_key.json'
};

const BROWSER_CONFIG = {
    PROOF_TIMEOUT: 30000, // 30 seconds
    CHUNK_SIZE: 10, // Process attestations in chunks of 10
    CACHE_KEY_PREFIX: 'zookies_circuit_',
    MAX_BUNDLE_SIZE: 5 * 1024 * 1024, // 5MB
    MIN_BROWSER_VERSIONS: {
        chrome: 90,
        firefox: 90,
        safari: 14,
        edge: 90
    }
};

console.log('🔧 TEST: Constants added successfully');

// Simple test function
function testZkProofBuilder() {
    console.log('🔧 TEST: Function execution working');
    return { test: true };
}

// Export to window
if (typeof window !== 'undefined') {
    console.log('🌐 TEST: Setting window.testZkProofBuilder');
    window.testZkProofBuilder = testZkProofBuilder;
}

console.log('✅ TEST: zkProofBuilder test file completed'); 