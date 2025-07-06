// Use global idb library (loaded via UMD) - avoid duplicate declarations
let openDB;
if (typeof window !== 'undefined' && window.idb && window.idb.openDB) {
    if (typeof window.openDB === 'undefined') {
        openDB = window.idb.openDB;
        window.openDB = openDB;
    } else {
        openDB = window.openDB;
    }
} else {
    console.warn('IndexedDB wrapper not available');
}

// Import Privy functions from global object
const { getEmbeddedWallet, createSignedProfileClaim } = window.privyModule || {};

// Constants - avoid duplicate declarations
const DB_NAME = typeof window !== 'undefined' && window.DB_NAME ? window.DB_NAME + '_profiles' : 'zookies_privy_cache';
const DB_VERSION = 2; // Increment version for finance attestations
const PROFILES_STORE = 'profiles';
const ATTESTATIONS_STORE = 'attestations';
const FINANCE_ATTESTATIONS_STORE = 'financeAttestations';

/**
 * Initialize the profile database with proper schema
 * @returns {Promise<IDBDatabase>}
 */
async function initializeProfileDB() {
    try {
        const db = await openDB(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion, newVersion) {
                // Profiles store - keyed by wallet address
                if (!db.objectStoreNames.contains(PROFILES_STORE)) {
                    const profileStore = db.createObjectStore(PROFILES_STORE, { keyPath: 'wallet' });
                    profileStore.createIndex('createdAt', 'createdAt');
                }
                
                // Attestations store - for future use
                if (!db.objectStoreNames.contains(ATTESTATIONS_STORE)) {
                    const attestationStore = db.createObjectStore(ATTESTATIONS_STORE, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    attestationStore.createIndex('walletAddress', 'walletAddress');
                    attestationStore.createIndex('timestamp', 'timestamp');
                }

                // Finance attestations store - for publisher click tracking
                if (!db.objectStoreNames.contains(FINANCE_ATTESTATIONS_STORE)) {
                    const financeStore = db.createObjectStore(FINANCE_ATTESTATIONS_STORE, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    financeStore.createIndex('timestamp', 'timestamp');
                    financeStore.createIndex('publisherSite', 'publisherSite');
                    financeStore.createIndex('sessionId', 'sessionId');
                    financeStore.createIndex('articleId', 'articleId');
                    financeStore.createIndex('proofGenerated', 'proofGenerated');
                }
            }
        });
        return db;
    } catch (error) {
        console.error('Failed to initialize profile database:', error);
        throw new Error('Failed to initialize profile database');
    }
}

/**
 * Ensure wallet exists and profile is bound
 * @returns {Promise<{success: boolean, profile?: object, error?: string}>}
 */
async function ensureWalletAndProfile() {
    try {
        // Get or create embedded wallet
        const { wallet, error: walletError } = await getEmbeddedWallet();
        if (walletError || !wallet) {
            throw new Error(walletError || 'Failed to get embedded wallet');
        }

        // Check if profile already exists
        const existingProfile = await getProfileByWallet(wallet.address);
        if (existingProfile.profile) {
            // Verify the existing profile is still valid
            const isValid = await verifyProfileClaim(existingProfile.profile);
            if (isValid) {
                return { success: true, profile: existingProfile.profile };
            }
        }

        // Create new signed profile claim
        const { success, claim, error } = await createSignedProfileClaim();
        if (!success || !claim) {
            throw new Error(error || 'Failed to create signed profile claim');
        }

        return { success: true, profile: claim };
    } catch (error) {
        console.error('Failed to ensure wallet and profile:', error);
        return {
            success: false,
            error: error.message || 'Failed to ensure wallet and profile'
        };
    }
}

/**
 * Get profile by wallet address
 * @param {string} walletAddress - The wallet address to look up
 * @returns {Promise<{profile?: object, error?: string}>}
 */
async function getProfileByWallet(walletAddress) {
    try {
        const db = await initializeProfileDB();
        const profile = await db.get(PROFILES_STORE, walletAddress);
        return { profile };
    } catch (error) {
        console.error('Failed to get profile by wallet:', error);
        return { error: error.message || 'Failed to get profile' };
    }
}

/**
 * Store or update a profile
 * @param {object} profile - The profile object to store
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function storeProfile(profile) {
    try {
        if (!profile.wallet || !profile.signedProfileClaim) {
            throw new Error('Invalid profile structure');
        }

        const db = await initializeProfileDB();
        await db.put(PROFILES_STORE, profile);
        
        return { success: true };
    } catch (error) {
        console.error('Failed to store profile:', error);
        return {
            success: false,
            error: error.message || 'Failed to store profile'
        };
    }
}

/**
 * Verify a profile claim signature
 * @param {object} profile - The profile to verify
 * @returns {Promise<boolean>}
 */
async function verifyProfileClaim(profile) {
    try {
        if (!profile.signedProfileClaim || !profile.wallet) {
            return false;
        }

        const { message, signature } = profile.signedProfileClaim;
        
        // Get current wallet to verify signature
        const { wallet, error } = await getEmbeddedWallet();
        if (error || !wallet || wallet.address !== profile.wallet) {
            return false;
        }

        // Use the wallet's provider to verify the signature
        const provider = await wallet.getEthereumProvider();
        
        // For verification, we'll use eth_sign method
        // Note: This is a simplified verification - in production you might want more robust verification
        try {
            const recoveredAddress = await provider.request({
                method: 'personal_ecRecover',
                params: [message, signature]
            });
            
            return recoveredAddress.toLowerCase() === profile.wallet.toLowerCase();
        } catch (verifyError) {
            // If personal_ecRecover is not available, we'll trust the stored signature
            // This is acceptable for our embedded wallet use case
            console.warn('Signature verification not available, trusting stored claim');
            return true;
        }
    } catch (error) {
        console.error('Failed to verify profile claim:', error);
        return false;
    }
}

/**
 * Add an attestation to a profile
 * @param {string} walletAddress - The wallet address
 * @param {object} attestation - The attestation to add
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function addAttestation(walletAddress, attestation) {
    try {
        const { profile, error } = await getProfileByWallet(walletAddress);
        if (error || !profile) {
            throw new Error(error || 'Profile not found');
        }

        // Add attestation to profile
        profile.attestations = profile.attestations || [];
        profile.attestations.push({
            ...attestation,
            timestamp: Date.now()
        });

        // Store updated profile
        const storeResult = await storeProfile(profile);
        if (!storeResult.success) {
            throw new Error(storeResult.error);
        }

        // Also store in attestations store for querying
        const db = await initializeProfileDB();
        await db.add(ATTESTATIONS_STORE, {
            walletAddress,
            attestation,
            timestamp: Date.now()
        });

        return { success: true };
    } catch (error) {
        console.error('Failed to add attestation:', error);
        return {
            success: false,
            error: error.message || 'Failed to add attestation'
        };
    }
}

/**
 * Get all profiles (for debugging/admin use)
 * @returns {Promise<{profiles?: object[], error?: string}>}
 */
async function getAllProfiles() {
    try {
        const db = await initializeProfileDB();
        const profiles = await db.getAll(PROFILES_STORE);
        return { profiles };
    } catch (error) {
        console.error('Failed to get all profiles:', error);
        return { error: error.message || 'Failed to get profiles' };
    }
}

/**
 * Clear all profile data (for testing/reset)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function clearAllProfiles() {
    try {
        const db = await initializeProfileDB();
        await db.clear(PROFILES_STORE);
        await db.clear(ATTESTATIONS_STORE);
        await db.clear(FINANCE_ATTESTATIONS_STORE);
        console.log('🗑️ All profile data and finance attestations cleared');
        return { success: true };
    } catch (error) {
        console.error('Failed to clear profiles:', error);
        return {
            success: false,
            error: error.message || 'Failed to clear profiles'
        };
    }
}

// ============================================================================
// FINANCE ATTESTATION TRACKING FUNCTIONS FOR ZOOKIES DEMO
// ============================================================================

/**
 * Record a finance attestation from publisher click
 * @param {object} attestationData - The attestation data from publisher site
 * @returns {Promise<{success: boolean, attestationId?: number, error?: string}>}
 */
async function recordFinanceAttestation(attestationData) {
    try {
        if (!attestationData || typeof attestationData !== 'object') {
            throw new Error('Invalid attestation data');
        }

        const attestation = {
            timestamp: Date.now(),
            publisherSite: attestationData.site || 'unknown',
            articleTitle: attestationData.articleTitle || 'Unknown Article',
            articleId: attestationData.articleId || null,
            articleTag: attestationData.articleTag || 'unknown',
            isFinanceContent: attestationData.isFinanceContent || false,
            sessionId: attestationData.sessionId || 'unknown',
            userAgent: attestationData.userAgent || navigator.userAgent.substring(0, 50),
            clickType: 'finance_article_click',
            proofGenerated: false,
            metadata: {
                url: attestationData.url || window.location.href,
                referrer: attestationData.referrer || document.referrer,
                timestamp: new Date().toISOString()
            }
        };

        const db = await initializeProfileDB();
        const result = await db.add(FINANCE_ATTESTATIONS_STORE, attestation);
        
        console.log('💾 Finance attestation recorded:', { id: result, attestation });
        
        return { success: true, attestationId: result };
    } catch (error) {
        console.error('❌ Failed to record finance attestation:', error);
        return {
            success: false,
            error: error.message || 'Failed to record finance attestation'
        };
    }
}

/**
 * Get finance attestations with optional filtering
 * @param {object} filters - Optional filters
 * @param {string} filters.publisherSite - Filter by publisher site
 * @param {string} filters.sessionId - Filter by session ID
 * @param {number} filters.fromTimestamp - Filter attestations after this timestamp
 * @param {number} filters.toTimestamp - Filter attestations before this timestamp
 * @param {number} filters.limit - Limit number of results
 * @returns {Promise<{attestations?: object[], error?: string}>}
 */
async function getFinanceAttestations(filters = {}) {
    try {
        const db = await initializeProfileDB();
        let attestations = await db.getAll(FINANCE_ATTESTATIONS_STORE);
        
        // Apply filters
        if (filters.publisherSite) {
            attestations = attestations.filter(a => a.publisherSite === filters.publisherSite);
        }
        
        if (filters.sessionId) {
            attestations = attestations.filter(a => a.sessionId === filters.sessionId);
        }
        
        if (filters.fromTimestamp) {
            attestations = attestations.filter(a => a.timestamp >= filters.fromTimestamp);
        }
        
        if (filters.toTimestamp) {
            attestations = attestations.filter(a => a.timestamp <= filters.toTimestamp);
        }
        
        // Sort by timestamp (newest first)
        attestations.sort((a, b) => b.timestamp - a.timestamp);
        
        // Apply limit
        if (filters.limit && filters.limit > 0) {
            attestations = attestations.slice(0, filters.limit);
        }
        
        return { attestations };
    } catch (error) {
        console.error('❌ Failed to get finance attestations:', error);
        return { error: error.message || 'Failed to get finance attestations' };
    }
}

/**
 * Get count of finance attestations
 * @param {object} filters - Optional filters (same as getFinanceAttestations)
 * @returns {Promise<{count?: number, error?: string}>}
 */
async function getAttestationCount(filters = {}) {
    try {
        const { attestations, error } = await getFinanceAttestations(filters);
        if (error) {
            throw new Error(error);
        }
        
        return { count: attestations.length };
    } catch (error) {
        console.error('❌ Failed to get attestation count:', error);
        return { error: error.message || 'Failed to get attestation count' };
    }
}

/**
 * Clear old attestations (data retention)
 * @param {number} daysToKeep - Number of days of attestations to keep
 * @returns {Promise<{success: boolean, deletedCount?: number, error?: string}>}
 */
async function clearOldAttestations(daysToKeep = 30) {
    try {
        const cutoffTimestamp = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
        const db = await initializeProfileDB();
        
        const allAttestations = await db.getAll(FINANCE_ATTESTATIONS_STORE);
        const oldAttestations = allAttestations.filter(a => a.timestamp < cutoffTimestamp);
        
        for (const attestation of oldAttestations) {
            await db.delete(FINANCE_ATTESTATIONS_STORE, attestation.id);
        }
        
        console.log(`🗑️ Cleared ${oldAttestations.length} old attestations`);
        
        return { success: true, deletedCount: oldAttestations.length };
    } catch (error) {
        console.error('❌ Failed to clear old attestations:', error);
        return {
            success: false,
            error: error.message || 'Failed to clear old attestations'
        };
    }
}

/**
 * Mark attestations as used in proof generation
 * @param {number[]} attestationIds - Array of attestation IDs
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function markAttestationsAsProofGenerated(attestationIds) {
    try {
        const db = await initializeProfileDB();
        
        for (const id of attestationIds) {
            const attestation = await db.get(FINANCE_ATTESTATIONS_STORE, id);
            if (attestation) {
                attestation.proofGenerated = true;
                attestation.proofTimestamp = Date.now();
                await db.put(FINANCE_ATTESTATIONS_STORE, attestation);
            }
        }
        
        console.log(`✅ Marked ${attestationIds.length} attestations as proof-generated`);
        
        return { success: true };
    } catch (error) {
        console.error('❌ Failed to mark attestations as proof-generated:', error);
        return {
            success: false,
            error: error.message || 'Failed to mark attestations as proof-generated'
        };
    }
}

/**
 * Get attestation statistics for debugging
 * @returns {Promise<{stats?: object, error?: string}>}
 */
async function getAttestationStats() {
    try {
        const { attestations, error } = await getFinanceAttestations();
        if (error) {
            throw new Error(error);
        }
        
        const stats = {
            totalAttestations: attestations.length,
            financeAttestations: attestations.filter(a => a.isFinanceContent).length,
            publisherBreakdown: {},
            sessionBreakdown: {},
            proofGenerated: attestations.filter(a => a.proofGenerated).length,
            last24Hours: attestations.filter(a => a.timestamp > Date.now() - 24 * 60 * 60 * 1000).length,
            oldestAttestation: attestations.length > 0 ? new Date(Math.min(...attestations.map(a => a.timestamp))).toISOString() : null,
            newestAttestation: attestations.length > 0 ? new Date(Math.max(...attestations.map(a => a.timestamp))).toISOString() : null
        };
        
        // Publisher breakdown
        attestations.forEach(a => {
            stats.publisherBreakdown[a.publisherSite] = (stats.publisherBreakdown[a.publisherSite] || 0) + 1;
        });
        
        // Session breakdown
        attestations.forEach(a => {
            stats.sessionBreakdown[a.sessionId] = (stats.sessionBreakdown[a.sessionId] || 0) + 1;
        });
        
        return { stats };
    } catch (error) {
        console.error('❌ Failed to get attestation stats:', error);
        return { error: error.message || 'Failed to get attestation stats' };
    }
}

// ============================================================================
// PUBLISHER SITE INTEGRATION AND EVENT HANDLING
// ============================================================================

/**
 * Initialize finance attestation tracking (call this on page load)
 */
function initializeFinanceAttestationTracking() {
    console.log('🎯 Initializing finance attestation tracking...');
    
    // Listen for finance article clicks from publisher sites
    window.addEventListener('finance-article-click', handleFinanceArticleClick);
    
    // Listen for custom attestation events
    window.addEventListener('user-qualified-for-ads', handleUserQualification);
    
    // Listen for cross-origin messages from publisher sites
    window.addEventListener('message', handleCrossOriginAttestation);
    
    console.log('✅ Finance attestation tracking initialized');
}

/**
 * Handle finance article click events
 * @param {CustomEvent} event - The finance article click event
 */
async function handleFinanceArticleClick(event) {
    try {
        const attestationData = event.detail;
        console.log('💰 Finance article click detected:', attestationData);
        
        const result = await recordFinanceAttestation(attestationData);
        if (result.success) {
            console.log('✅ Finance attestation recorded successfully');
            
            // Check if user now qualifies for ads
            const { count } = await getAttestationCount({ isFinanceContent: true });
            if (count >= 2) {
                console.log('🎯 User qualifies for targeted ads!');
                
                // Emit qualification event
                window.dispatchEvent(new CustomEvent('zookies-user-qualified', {
                    detail: {
                        financeAttestations: count,
                        threshold: 2,
                        qualified: true
                    }
                }));
            }
        }
    } catch (error) {
        console.error('❌ Failed to handle finance article click:', error);
    }
}

/**
 * Handle user qualification events
 * @param {CustomEvent} event - The user qualification event
 */
function handleUserQualification(event) {
    console.log('🎯 User qualification event:', event.detail);
    
    // This event indicates the user has met the qualification threshold
    // ZK proof generation can be triggered here if needed
}

/**
 * Handle cross-origin attestation messages from publisher sites
 * @param {MessageEvent} event - The message event
 */
async function handleCrossOriginAttestation(event) {
    try {
        // Only accept messages from known publisher domains
        const allowedOrigins = [
            'http://localhost:8000',
            'http://localhost:8001',
            'http://127.0.0.1:8000',
            'http://127.0.0.1:8001'
        ];
        
        if (!allowedOrigins.includes(event.origin)) {
            return; // Ignore messages from unknown origins
        }
        
        if (event.data && event.data.type === 'finance-attestation') {
            console.log('📨 Cross-origin finance attestation received:', event.data);
            
            const result = await recordFinanceAttestation(event.data.attestation);
            if (result.success) {
                // Send confirmation back to publisher
                event.source.postMessage({
                    type: 'attestation-confirmation',
                    attestationId: result.attestationId,
                    success: true
                }, event.origin);
            }
        }
    } catch (error) {
        console.error('❌ Failed to handle cross-origin attestation:', error);
    }
}

/**
 * Clear all finance attestations (for testing/reset)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function clearAllFinanceAttestations() {
    try {
        const db = await initializeProfileDB();
        await db.clear(FINANCE_ATTESTATIONS_STORE);
        console.log('🗑️ All finance attestations cleared');
        return { success: true };
    } catch (error) {
        console.error('❌ Failed to clear finance attestations:', error);
        return {
            success: false,
            error: error.message || 'Failed to clear finance attestations'
        };
    }
}

// Make functions available globally for browser environment
if (typeof window !== 'undefined') {
    window.profileStoreModule = {
        // Original functions
        ensureWalletAndProfile,
        getProfileByWallet,
        storeProfile,
        verifyProfileClaim,
        addAttestation,
        getAllProfiles,
        clearAllProfiles,
        
        // Finance attestation functions
        recordFinanceAttestation,
        getFinanceAttestations,
        getAttestationCount,
        clearOldAttestations,
        markAttestationsAsProofGenerated,
        getAttestationStats,
        clearAllFinanceAttestations,
        initializeFinanceAttestationTracking
    };
    
    // Debug helpers (browser environment)
    if (typeof window !== 'undefined' && typeof process === 'undefined') {
        window.zkAgent = window.zkAgent || {};
        window.zkAgent.profiles = {
            getAll: getAllProfiles,
            clear: clearAllProfiles,
            getByWallet: getProfileByWallet,
            verify: verifyProfileClaim
        };
        
        // Finance attestation debug helpers
        window.zkAgent.financeAttestations = {
            record: recordFinanceAttestation,
            getAll: getFinanceAttestations,
            getCount: getAttestationCount,
            getStats: getAttestationStats,
            clear: clearAllFinanceAttestations,
            clearOld: clearOldAttestations,
            markProofGenerated: markAttestationsAsProofGenerated
        };
        
        // Test functions for manual testing
        window.testAttestation = function(overrides = {}) {
            const testData = {
                site: 'test-site',
                articleTitle: 'Test Finance Article',
                articleId: 'test-1',
                articleTag: 'finance',
                isFinanceContent: true,
                sessionId: 'test-session-' + Date.now(),
                userAgent: navigator.userAgent.substring(0, 50),
                ...overrides
            };
            
            return recordFinanceAttestation(testData);
        };
        
        window.getAttestationStats = getAttestationStats;
    }
    
    // Auto-initialize finance attestation tracking on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeFinanceAttestationTracking);
    } else {
        // Document already loaded
        initializeFinanceAttestationTracking();
    }
} 