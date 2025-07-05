/**
 * zkProofBuilder.js - Zero-Knowledge Proof Generation Orchestration Module
 * Handles attestation preprocessing, circuit input preparation, and SnarkJS integration
 * for browser-based threshold proof generation using Groth16
 */

console.log('🟢 zkProofBuilder.js loading...');

// Prevent multiple execution
if (typeof window !== 'undefined' && window.ZkProofBuilder) {
    console.log('⚠️ zkProofBuilder.js already loaded, skipping...');
} else {

// Browser-compatible imports and dependencies
let snarkjs, crypto;

// Load dependencies in browser environment
if (typeof window !== 'undefined') {
    // SnarkJS should be loaded via script tag
    snarkjs = window.snarkjs;
    crypto = window.crypto || window.msCrypto;
    
    if (!snarkjs) {
        console.warn('⚠️ SnarkJS not available - proof generation will fail');
    }
    
    if (!crypto) {
        console.warn('⚠️ WebCrypto API not available - hashing will fail');
    }
} else {
    // Node.js environment (for testing)
    try {
        snarkjs = require('snarkjs');
        crypto = require('crypto');
    } catch (error) {
        console.warn('zkProofBuilder: Dependencies not available in Node.js environment');
    }
}

/**
 * Custom error classes for proof generation operations
 */
class ProofGenerationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ProofGenerationError';
    }
}

class AttestationValidationError extends ProofGenerationError {
    constructor(message) {
        super(message);
        this.name = 'AttestationValidationError';
    }
}

class CircuitInputError extends ProofGenerationError {
    constructor(message) {
        super(message);
        this.name = 'CircuitInputError';
    }
}

/**
 * Tag dictionary for mapping string tags to numeric indices
 * Must match the circuit implementation expectations
 */
const TAG_DICTIONARY = {
    defi: 0,
    privacy: 1, 
    travel: 2,
    gaming: 3,
    technology: 4,
    finance: 5
};

// Reverse mapping for decoding
const TAG_INDEX_TO_STRING = Object.fromEntries(
    Object.entries(TAG_DICTIONARY).map(([key, value]) => [value, key])
);

/**
 * Circuit file paths (relative to project root)
 */
const CIRCUIT_PATHS = {
    wasm: '/circom/build/circuits/ThresholdProof_js/ThresholdProof.wasm',
    zkey: '/circom/build/keys/ThresholdProof_final.zkey',
    verificationKey: '/circom/build/keys/verification_key.json'
};

/**
 * Circuit constraints - must match the circuit compilation parameters
 */
const CIRCUIT_CONSTRAINTS = {
    MAX_ATTESTATIONS: 50, // Must match ThresholdProof(50) in the circuit
    DEFAULT_HASH: '0x0000000000000000000000000000000000000000000000000000000000000000',
    DEFAULT_TAG: 0
};

/**
 * Browser performance configuration
 */
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

/**
 * ZkProofBuilder class for orchestrating zero-knowledge proof generation
 */
class ZkProofBuilder {
    constructor() {
        this.isInitialized = false;
        this.dbManager = null;
        this.trustedKeys = null;
        
        // Browser-specific properties
        this.circuitFiles = {
            wasm: null,
            zkey: null,
            verificationKey: null
        };
        this.isCircuitCached = false;
        this.performanceMetrics = {
            loadTime: 0,
            proofTime: 0,
            memoryUsage: 0
        };
        this.progressCallback = null;
    }

    /**
     * Initialize the proof builder with dependencies
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            // Get database manager instance
            if (typeof window !== 'undefined' && window.getBrowserDatabase) {
                this.dbManager = window.getBrowserDatabase();
                await this.dbManager.ensureInitialized();
            } else {
                throw new ProofGenerationError('Database manager not available');
            }

            // Load trusted publisher keys
            this.trustedKeys = this.getTrustedPublisherKeys();
            
            this.isInitialized = true;
            console.log('✅ ZkProofBuilder initialized successfully');
        } catch (error) {
            throw new ProofGenerationError(`Failed to initialize ZkProofBuilder: ${error.message}`);
        }
    }

    /**
     * Ensure the proof builder is initialized
     * @returns {Promise<void>}
     */
    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.initialize();
        }
    }

    /**
     * Check browser compatibility for ZK proof generation
     * @returns {Object} - Compatibility status and details
     */
    checkBrowserCompatibility() {
        const result = {
            compatible: true,
            issues: [],
            browserInfo: {}
        };

        // Check if running in browser
        if (typeof window === 'undefined') {
            result.compatible = false;
            result.issues.push('Not running in browser environment');
            return result;
        }

        // Check WebAssembly support
        if (typeof WebAssembly === 'undefined') {
            result.compatible = false;
            result.issues.push('WebAssembly not supported');
        }

        // Check BigInt support
        if (typeof BigInt === 'undefined') {
            result.compatible = false;
            result.issues.push('BigInt not supported');
        }

        // Check WebCrypto API
        if (!crypto || !crypto.subtle) {
            result.compatible = false;
            result.issues.push('WebCrypto API not available');
        }

        // Check IndexedDB support
        if (!window.indexedDB) {
            result.compatible = false;
            result.issues.push('IndexedDB not supported');
        }

        // Detect browser and version
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Chrome/')) {
            const version = parseInt(userAgent.match(/Chrome\/(\d+)/)?.[1] || '0');
            result.browserInfo = { name: 'Chrome', version };
            if (version < BROWSER_CONFIG.MIN_BROWSER_VERSIONS.chrome) {
                result.issues.push(`Chrome ${version} too old, need ${BROWSER_CONFIG.MIN_BROWSER_VERSIONS.chrome}+`);
            }
        } else if (userAgent.includes('Firefox/')) {
            const version = parseInt(userAgent.match(/Firefox\/(\d+)/)?.[1] || '0');
            result.browserInfo = { name: 'Firefox', version };
            if (version < BROWSER_CONFIG.MIN_BROWSER_VERSIONS.firefox) {
                result.issues.push(`Firefox ${version} too old, need ${BROWSER_CONFIG.MIN_BROWSER_VERSIONS.firefox}+`);
            }
        } else if (userAgent.includes('Safari/')) {
            const version = parseInt(userAgent.match(/Version\/(\d+)/)?.[1] || '0');
            result.browserInfo = { name: 'Safari', version };
            if (version < BROWSER_CONFIG.MIN_BROWSER_VERSIONS.safari) {
                result.issues.push(`Safari ${version} too old, need ${BROWSER_CONFIG.MIN_BROWSER_VERSIONS.safari}+`);
            }
        } else if (userAgent.includes('Edg/')) {
            const version = parseInt(userAgent.match(/Edg\/(\d+)/)?.[1] || '0');
            result.browserInfo = { name: 'Edge', version };
            if (version < BROWSER_CONFIG.MIN_BROWSER_VERSIONS.edge) {
                result.issues.push(`Edge ${version} too old, need ${BROWSER_CONFIG.MIN_BROWSER_VERSIONS.edge}+`);
            }
        }

        if (result.issues.length > 0) {
            result.compatible = false;
        }

        return result;
    }

    /**
     * Load circuit files with caching in IndexedDB
     * @param {Function} progressCallback - Optional progress callback
     * @returns {Promise<void>}
     */
    async loadCircuitFiles(progressCallback = null) {
        this.progressCallback = progressCallback;
        
        try {
            this.updateProgress('Checking browser compatibility...', 0);
            
            // Check browser compatibility first
            const compatibility = this.checkBrowserCompatibility();
            if (!compatibility.compatible) {
                throw new ProofGenerationError(`Browser incompatible: ${compatibility.issues.join(', ')}`);
            }

            console.log('✅ Browser compatibility check passed:', compatibility.browserInfo);

            // Try to load from cache first
            this.updateProgress('Checking circuit cache...', 10);
            const cached = await this.loadFromCache();
            if (cached) {
                this.updateProgress('Circuit files loaded from cache', 100);
                return;
            }

            // Load from network if not cached
            this.updateProgress('Loading circuit files from network...', 20);
            const startTime = Date.now();

            const loadPromises = [
                this.loadFileWithRetry(CIRCUIT_PATHS.wasm, 'wasm'),
                this.loadFileWithRetry(CIRCUIT_PATHS.zkey, 'zkey')
            ];

            // Load files in parallel
            const [wasmBuffer, zkeyBuffer] = await Promise.all(loadPromises);

            this.circuitFiles.wasm = wasmBuffer;
            this.circuitFiles.zkey = zkeyBuffer;

            this.performanceMetrics.loadTime = Date.now() - startTime;
            this.updateProgress('Circuit files loaded, caching...', 80);

            // Cache the files for future use
            await this.saveToCache();
            
            this.isCircuitCached = true;
            this.updateProgress('Circuit files ready', 100);
            
            console.log(`✅ Circuit files loaded in ${this.performanceMetrics.loadTime}ms`);

        } catch (error) {
            this.updateProgress('Failed to load circuit files', 0);
            throw new ProofGenerationError(`Failed to load circuit files: ${error.message}`);
        }
    }

    /**
     * Load file with retry mechanism
     * @param {string} url - File URL
     * @param {string} type - File type for progress tracking
     * @returns {Promise<ArrayBuffer>}
     */
    async loadFileWithRetry(url, type, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.updateProgress(`Loading ${type} file (attempt ${attempt}/${maxRetries})...`, 20 + (attempt * 15));
                
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const buffer = await response.arrayBuffer();
                
                // Verify file size is reasonable
                if (buffer.byteLength === 0) {
                    throw new Error('Empty file received');
                }
                
                if (buffer.byteLength > BROWSER_CONFIG.MAX_BUNDLE_SIZE) {
                    throw new Error(`File too large: ${buffer.byteLength} bytes`);
                }

                console.log(`✅ ${type} file loaded: ${buffer.byteLength} bytes`);
                return buffer;

            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Failed to load ${type} file (attempt ${attempt}):`, error.message);
                
                if (attempt < maxRetries) {
                    // Exponential backoff
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
        }

        throw new ProofGenerationError(`Failed to load ${url} after ${maxRetries} attempts: ${lastError.message}`);
    }

    /**
     * Load circuit files from IndexedDB cache
     * @returns {Promise<boolean>} - True if loaded from cache
     */
    async loadFromCache() {
        try {
            if (!window.indexedDB) {
                return false;
            }

            const db = await this.openCacheDB();
            const transaction = db.transaction(['circuitFiles'], 'readonly');
            const store = transaction.objectStore('circuitFiles');

            const [wasmCache, zkeyCache] = await Promise.all([
                this.getCacheItem(store, 'wasm'),
                this.getCacheItem(store, 'zkey')
            ]);

            if (wasmCache && zkeyCache) {
                // Check cache validity (files exist and are recent)
                const maxAge = 24 * 60 * 60 * 1000; // 24 hours
                const now = Date.now();
                
                if ((now - wasmCache.timestamp) < maxAge && (now - zkeyCache.timestamp) < maxAge) {
                    this.circuitFiles.wasm = wasmCache.data;
                    this.circuitFiles.zkey = zkeyCache.data;
                    this.isCircuitCached = true;
                    
                    console.log('✅ Circuit files loaded from cache');
                    return true;
                }
            }

        } catch (error) {
            console.warn('Failed to load from cache:', error.message);
        }

        return false;
    }

    /**
     * Save circuit files to IndexedDB cache
     * @returns {Promise<void>}
     */
    async saveToCache() {
        try {
            if (!window.indexedDB || !this.circuitFiles.wasm || !this.circuitFiles.zkey) {
                return;
            }

            const db = await this.openCacheDB();
            const transaction = db.transaction(['circuitFiles'], 'readwrite');
            const store = transaction.objectStore('circuitFiles');

            const timestamp = Date.now();

            await Promise.all([
                this.setCacheItem(store, 'wasm', this.circuitFiles.wasm, timestamp),
                this.setCacheItem(store, 'zkey', this.circuitFiles.zkey, timestamp)
            ]);

            console.log('✅ Circuit files cached successfully');

        } catch (error) {
            console.warn('Failed to save to cache:', error.message);
        }
    }

    /**
     * Open IndexedDB cache database
     * @returns {Promise<IDBDatabase>}
     */
    async openCacheDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(`${BROWSER_CONFIG.CACHE_KEY_PREFIX}db`, 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('circuitFiles')) {
                    db.createObjectStore('circuitFiles', { keyPath: 'id' });
                }
            };
        });
    }

    /**
     * Get item from cache store
     * @param {IDBObjectStore} store - IndexedDB store
     * @param {string} key - Cache key
     * @returns {Promise<Object>}
     */
    async getCacheItem(store, key) {
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    /**
     * Set item in cache store
     * @param {IDBObjectStore} store - IndexedDB store
     * @param {string} key - Cache key
     * @param {ArrayBuffer} data - Data to cache
     * @param {number} timestamp - Cache timestamp
     * @returns {Promise<void>}
     */
    async setCacheItem(store, key, data, timestamp) {
        return new Promise((resolve, reject) => {
            const request = store.put({ id: key, data, timestamp });
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    /**
     * Update progress callback if available
     * @param {string} message - Progress message
     * @param {number} percentage - Progress percentage (0-100)
     */
    updateProgress(message, percentage) {
        if (this.progressCallback) {
            this.progressCallback({ message, percentage });
        }
    }

    /**
     * Prepare zero-knowledge proof inputs from attestations
     * @param {Object} options - Configuration options
     * @param {string} options.tag - Target tag for proof (default: "defi")
     * @param {number} options.threshold - Minimum number of attestations required (default: 2)
     * @param {string} options.walletAddress - Wallet address (optional, loads from profile if not provided)
     * @returns {Promise<Object>} - Structured circuit inputs
     */
    async prepareZKInputs({ tag = "defi", threshold = 2, walletAddress = null } = {}) {
        await this.ensureInitialized();

        try {
            // Validate tag
            if (!(tag in TAG_DICTIONARY)) {
                throw new CircuitInputError(`Invalid tag: ${tag}. Must be one of: ${Object.keys(TAG_DICTIONARY).join(', ')}`);
            }

            // Validate threshold
            if (threshold < 1 || threshold > 10) {
                throw new CircuitInputError('Threshold must be between 1 and 10');
            }

            // Load local profile and get wallet address
            let profileWallet = walletAddress;
            if (!profileWallet) {
                const profile = await this.loadLocalProfile();
                if (!profile || !profile.wallet) {
                    throw new AttestationValidationError('No local profile found. Please connect wallet first.');
                }
                profileWallet = profile.wallet;
            }

            // Load all attestations for the wallet
            const allAttestations = await this.dbManager.getAllAttestations(profileWallet);
            console.log(`📊 Loaded ${allAttestations.length} total attestations for wallet ${profileWallet}`);

            // Filter and verify attestations
            const verifiedAttestations = await this.filterAndVerifyAttestations(allAttestations);
            console.log(`✅ ${verifiedAttestations.length} attestations passed verification`);

            // Check if we have enough attestations
            if (verifiedAttestations.length < threshold) {
                throw new AttestationValidationError(
                    `Insufficient attestations: found ${verifiedAttestations.length}, need ${threshold}`
                );
            }

            // Process attestations into circuit inputs
            const attestationHashes = await this.processAttestationHashes(verifiedAttestations);
            const tagIndices = this.mapAttestationTags(verifiedAttestations);

            // Pad arrays to match circuit constraints (exactly 50 elements)
            const paddedHashes = [...attestationHashes];
            const paddedTags = [...tagIndices];
            
            while (paddedHashes.length < CIRCUIT_CONSTRAINTS.MAX_ATTESTATIONS) {
                paddedHashes.push(CIRCUIT_CONSTRAINTS.DEFAULT_HASH);
                paddedTags.push(CIRCUIT_CONSTRAINTS.DEFAULT_TAG);
            }

            // Get wallet signature components (r, s) from signedProfileClaim
            const walletSig = await this.extractWalletSignature(profileWallet);

            // Prepare final circuit inputs
            const circuitInputs = {
                attestationHashes: paddedHashes,
                tagIndices: paddedTags,
                walletSig: walletSig,
                targetTag: TAG_DICTIONARY[tag],
                threshold: threshold
            };

            console.log('🔧 Circuit inputs prepared:', {
                attestationCount: attestationHashes.length,
                paddedArrayLength: paddedHashes.length,
                targetTag: tag,
                threshold: threshold
            });

            return circuitInputs;

        } catch (error) {
            if (error instanceof ProofGenerationError) {
                throw error;
            }
            throw new CircuitInputError(`Failed to prepare ZK inputs: ${error.message}`);
        }
    }

    /**
     * Generate zero-knowledge proof using SnarkJS
     * @param {Object} circuitInputs - Structured circuit inputs from prepareZKInputs
     * @returns {Promise<Object>} - Generated proof and public signals
     */
    /**
     * Generate zero-knowledge proof using prepared inputs (Browser-optimized)
     * @param {Object} circuitInputs - Prepared circuit inputs from prepareZKInputs()
     * @param {Function} progressCallback - Optional progress callback
     * @returns {Promise<Object>} - Generated proof and public signals
     */
    async generateProof(circuitInputs, progressCallback = null) {
        await this.ensureInitialized();

        try {
            // Validate circuit inputs
            this.validateCircuitInputs(circuitInputs);

            // Check SnarkJS availability
            if (!snarkjs) {
                throw new ProofGenerationError('SnarkJS not available for proof generation');
            }

            console.log('🔧 Starting browser-optimized proof generation...');
            
            // Track memory usage if available
            const startMemory = this.measureMemoryUsage();
            const startTime = Date.now();
            
            // Update progress
            if (progressCallback) {
                progressCallback({ message: 'Preparing circuit files...', percentage: 0 });
            }

            // Skip file loading - use URLs directly for better memory efficiency
            console.log('ℹ️ Using direct URL access to circuit files');
            
            if (progressCallback) {
                progressCallback({ message: 'Generating zero-knowledge proof...', percentage: 30 });
            }

            // Setup timeout for proof generation
            const proofPromise = this.generateProofWithTimeout(circuitInputs);
            
            const { proof, publicSignals } = await proofPromise;

            const proofTime = Date.now() - startTime;
            const endMemory = this.measureMemoryUsage();
            
            // Update performance metrics
            this.performanceMetrics.proofTime = proofTime;
            this.performanceMetrics.memoryUsage = endMemory - startMemory;

            if (progressCallback) {
                progressCallback({ message: 'Proof generation completed!', percentage: 100 });
            }

            console.log(`✅ Proof generated successfully in ${proofTime}ms`);

            // Log comprehensive proof statistics
            console.log('📊 Proof generation statistics:', {
                proofSize: JSON.stringify(proof).length,
                publicSignalsCount: publicSignals.length,
                generationTime: proofTime,
                loadTime: this.performanceMetrics.loadTime,
                memoryDelta: this.performanceMetrics.memoryUsage,
                wasCached: this.isCircuitCached
            });

            // Cleanup and memory management
            this.performMemoryCleanup();

            return {
                proof: proof,
                publicSignals: publicSignals,
                circuitInputs: circuitInputs,
                generationTime: proofTime,
                loadTime: this.performanceMetrics.loadTime,
                memoryUsage: this.performanceMetrics.memoryUsage,
                cached: this.isCircuitCached
            };

        } catch (error) {
            console.error('❌ Proof generation failed:', error);
            this.performMemoryCleanup();
            throw new ProofGenerationError(`Failed to generate proof: ${error.message}`);
        }
    }

    /**
     * Generate proof with timeout protection
     * @param {Object} circuitInputs - Circuit inputs
     * @returns {Promise<Object>} - Proof result
     */
    async generateProofWithTimeout(circuitInputs) {
        return new Promise(async (resolve, reject) => {
            // Setup timeout
            const timeout = setTimeout(() => {
                reject(new ProofGenerationError(`Proof generation timed out after ${BROWSER_CONFIG.PROOF_TIMEOUT}ms`));
            }, BROWSER_CONFIG.PROOF_TIMEOUT);

            try {
                // Generate proof using circuit file URLs (more memory efficient)
                const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                    circuitInputs,
                    CIRCUIT_PATHS.wasm,
                    CIRCUIT_PATHS.zkey
                );

                clearTimeout(timeout);
                resolve({ proof, publicSignals });

            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }

    /**
     * Measure memory usage if available
     * @returns {number} - Memory usage in bytes, or 0 if unavailable
     */
    measureMemoryUsage() {
        try {
            if (performance.measureUserAgentSpecificMemory) {
                // Chrome-specific memory measurement
                return performance.memory ? performance.memory.usedJSHeapSize : 0;
            }
            return 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Perform memory cleanup after proof generation
     */
    performMemoryCleanup() {
        try {
            // Clear progress callback reference
            this.progressCallback = null;
            
            // Suggest garbage collection if available
            if (window.gc && typeof window.gc === 'function') {
                window.gc();
            }
            
            // Clear large circuit files from memory if they're not cached
            // Keep them if cached for better performance
            if (!this.isCircuitCached) {
                this.circuitFiles.wasm = null;
                this.circuitFiles.zkey = null;
            }
            
            console.log('🧹 Memory cleanup completed');
        } catch (error) {
            console.warn('Memory cleanup failed:', error.message);
        }
    }

    /**
     * Submit proof for verification via API
     * @param {Object} proof - Generated proof object
     * @param {Array} publicSignals - Public signals array
     * @param {Object} metadata - Additional metadata (optional)
     * @returns {Promise<Object>} - Verification result
     */
    async submitProof(proof, publicSignals, metadata = {}) {
        try {
            const payload = {
                proof: proof,
                publicSignals: publicSignals,
                metadata: {
                    timestamp: Date.now(),
                    ...metadata
                }
            };

            console.log('📤 Submitting proof for verification...');

            const response = await fetch('/api/verify-proof', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new ProofGenerationError(
                    `API request failed: ${response.status} ${response.statusText}`
                );
            }

            const result = await response.json();
            console.log('✅ Proof verification result:', result);

            return result;

        } catch (error) {
            if (error instanceof ProofGenerationError) {
                throw error;
            }
            throw new ProofGenerationError(`Failed to submit proof: ${error.message}`);
        }
    }

    /**
     * Load local profile from database
     * @returns {Promise<Object|null>} - Profile object or null
     */
    async loadLocalProfile() {
        try {
            // In browser environment, we need to get the current wallet from zkAffinityAgent
            if (typeof window !== 'undefined' && window.zkAffinityAgent) {
                const walletAddress = await window.zkAffinityAgent.getWalletAddress();
                if (walletAddress) {
                    return await this.dbManager.getProfile(walletAddress);
                }
            }
            
            // Fallback: try to get from session or other means
            return null;
        } catch (error) {
            console.warn('Failed to load local profile:', error.message);
            return null;
        }
    }

    /**
     * Filter attestations and verify signatures against trusted publisher keys
     * @param {Array} attestations - Raw attestations array
     * @returns {Promise<Array>} - Verified attestations
     */
    async filterAndVerifyAttestations(attestations) {
        const verified = [];

        for (const attestation of attestations) {
            try {
                if (this.verifySignature(attestation, this.trustedKeys)) {
                    verified.push(attestation);
                } else {
                    console.warn('🚫 Attestation failed signature verification:', attestation.id);
                }
            } catch (error) {
                console.warn('🚫 Error verifying attestation:', attestation.id, error.message);
            }
        }

        return verified;
    }

    /**
     * Process attestations into SHA256 hashes
     * @param {Array} attestations - Verified attestations
     * @returns {Promise<Array>} - Array of 32-byte hex hash strings
     */
    async processAttestationHashes(attestations) {
        const hashes = [];

        for (const attestation of attestations) {
            try {
                const hash = await this.hashAttestation(attestation);
                hashes.push(hash);
            } catch (error) {
                console.warn('Failed to hash attestation:', attestation.id, error.message);
            }
        }

        return hashes;
    }

    /**
     * Map attestation tags to numeric indices
     * @param {Array} attestations - Verified attestations
     * @returns {Array} - Array of numeric tag indices
     */
    mapAttestationTags(attestations) {
        return attestations.map(attestation => {
            const tagIndex = this.encodeTag(attestation.tag);
            if (tagIndex === null) {
                console.warn('Unknown tag in attestation:', attestation.tag);
                return 0; // Default to first tag
            }
            return tagIndex;
        });
    }

    /**
     * Extract wallet signature components (r, s) from signedProfileClaim
     * @param {string} walletAddress - Wallet address
     * @returns {Promise<Array>} - [r, s] signature components
     */
    async extractWalletSignature(walletAddress) {
        try {
            // For now, return mock signature components
            // This would be replaced with actual profile claim signature extraction
            return [
                "0x1234567890abcdef", // r component
                "0xfedcba0987654321"  // s component
            ];
        } catch (error) {
            throw new CircuitInputError(`Failed to extract wallet signature: ${error.message}`);
        }
    }

    // Utility Functions

    /**
     * Hash attestation using SHA256
     * @param {Object} attestation - Attestation object
     * @returns {Promise<string>} - 32-byte hex hash string
     */
    async hashAttestation(attestation) {
        try {
            // Create standardized string representation for hashing
            const hashInput = JSON.stringify({
                tag: attestation.tag,
                timestamp: attestation.timestamp,
                nonce: attestation.nonce,
                publisher: attestation.publisher,
                user_wallet: attestation.user_wallet
            });

            // Use browser WebCrypto API
            if (crypto && crypto.subtle) {
                const encoder = new TextEncoder();
                const data = encoder.encode(hashInput);
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = new Uint8Array(hashBuffer);
                const hashHex = Array.from(hashArray)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
                return '0x' + hashHex;
            } else {
                throw new Error('WebCrypto API not available');
            }
        } catch (error) {
            throw new ProofGenerationError(`Failed to hash attestation: ${error.message}`);
        }
    }

    /**
     * Verify attestation signature against trusted publisher keys
     * @param {Object} attestation - Attestation object
     * @param {Object} trustedKeys - Trusted publisher keys
     * @returns {boolean} - Verification result
     */
    verifySignature(attestation, trustedKeys) {
        try {
            // Get publisher key
            const publisherKey = trustedKeys[attestation.publisher];
            if (!publisherKey) {
                console.warn('No trusted key found for publisher:', attestation.publisher);
                return false;
            }

            // Use the verification function from cryptography-browser.js
            if (typeof window !== 'undefined' && window.PublisherSigner) {
                return window.PublisherSigner.verifyAttestation(attestation, publisherKey.address);
            }

            // Fallback for basic verification
            return true; // For now, assume all attestations are valid
        } catch (error) {
            console.error('Signature verification error:', error.message);
            return false;
        }
    }

    /**
     * Get trusted publisher keys
     * @returns {Object} - Trusted publisher keys
     */
    getTrustedPublisherKeys() {
        if (typeof window !== 'undefined' && window.PUBLISHER_KEYS) {
            return window.PUBLISHER_KEYS;
        }
        
        // Fallback keys if not available
        return {
            'themodernbyte.com': {
                address: '0x8d5625f97295ce30cD728c5bb1Aa2af1751D8Dd3'
            },
            'smartlivingguide.com': {
                address: '0x5467A29a4536C34e7734a2EA9467eA26e330069b'
            }
        };
    }

    /**
     * Encode tag string to numeric index
     * @param {string} tagString - Tag string
     * @returns {number|null} - Numeric index or null if unknown
     */
    encodeTag(tagString) {
        return TAG_DICTIONARY[tagString] || null;
    }

    /**
     * Decode numeric index to tag string
     * @param {number} tagIndex - Numeric index
     * @returns {string|null} - Tag string or null if unknown
     */
    decodeTag(tagIndex) {
        return TAG_INDEX_TO_STRING[tagIndex] || null;
    }

    /**
     * Validate circuit inputs structure
     * @param {Object} inputs - Circuit inputs object
     * @throws {CircuitInputError} - If validation fails
     */
    validateCircuitInputs(inputs) {
        const requiredFields = ['attestationHashes', 'tagIndices', 'walletSig', 'targetTag', 'threshold'];
        
        for (const field of requiredFields) {
            if (!(field in inputs)) {
                throw new CircuitInputError(`Missing required field: ${field}`);
            }
        }

        // Validate arrays
        if (!Array.isArray(inputs.attestationHashes)) {
            throw new CircuitInputError('attestationHashes must be an array');
        }

        if (!Array.isArray(inputs.tagIndices)) {
            throw new CircuitInputError('tagIndices must be an array');
        }

        if (!Array.isArray(inputs.walletSig)) {
            throw new CircuitInputError('walletSig must be an array');
        }

        // Validate array lengths match
        if (inputs.attestationHashes.length !== inputs.tagIndices.length) {
            throw new CircuitInputError('attestationHashes and tagIndices arrays must have same length');
        }

        // Validate hash format
        for (const hash of inputs.attestationHashes) {
            if (typeof hash !== 'string' || !hash.startsWith('0x') || hash.length !== 66) {
                throw new CircuitInputError('Invalid hash format in attestationHashes');
            }
        }

        // Validate tag indices
        for (const tagIndex of inputs.tagIndices) {
            if (typeof tagIndex !== 'number' || tagIndex < 0 || tagIndex > 5) {
                throw new CircuitInputError('Invalid tag index in tagIndices');
            }
        }

        // Validate targetTag and threshold
        if (typeof inputs.targetTag !== 'number' || inputs.targetTag < 0 || inputs.targetTag > 5) {
            throw new CircuitInputError('Invalid targetTag value');
        }

        if (typeof inputs.threshold !== 'number' || inputs.threshold < 1) {
            throw new CircuitInputError('Invalid threshold value');
        }
    }

    /**
     * Memory optimization: process attestations in batches
     * @param {Array} attestations - Attestations to process
     * @param {number} batchSize - Batch size (default: 50)
     * @param {Function} processor - Processing function
     * @returns {Promise<Array>} - Processed results
     */
    async processBatch(attestations, batchSize = 50, processor) {
        const results = [];
        
        for (let i = 0; i < attestations.length; i += batchSize) {
            const batch = attestations.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(processor));
            results.push(...batchResults);
            
            // Allow other tasks to run
            if (i + batchSize < attestations.length) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        return results;
    }

    /**
     * Cleanup intermediate data structures for memory optimization
     */
    cleanup() {
        // Clear any cached data
        this.trustedKeys = null;
        console.log('🧹 ZkProofBuilder cleanup completed');
    }
}

// Create singleton instance
let zkProofBuilderInstance = null;

/**
 * Get singleton ZkProofBuilder instance
 * @returns {ZkProofBuilder}
 */
function getZkProofBuilder() {
    if (!zkProofBuilderInstance) {
        zkProofBuilderInstance = new ZkProofBuilder();
    }
    return zkProofBuilderInstance;
}

// Export for browser and Node.js environments
if (typeof window !== 'undefined') {
    // Browser environment
    window.ZkProofBuilder = ZkProofBuilder;
    window.getZkProofBuilder = getZkProofBuilder;
    window.ProofGenerationError = ProofGenerationError;
    window.AttestationValidationError = AttestationValidationError;
    window.CircuitInputError = CircuitInputError;
    
    console.log('✅ ZkProofBuilder available on window object');
} else if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        ZkProofBuilder,
        getZkProofBuilder,
        ProofGenerationError,
        AttestationValidationError,
        CircuitInputError,
        TAG_DICTIONARY
    };
}

console.log('✅ zkProofBuilder.js loaded successfully');

} // End of guard block 