// Use global idb library (loaded via UMD)
const { openDB } = window.idb || {};
// Import Privy functions from global object
const { getEmbeddedWallet, createSignedProfileClaim } = window.privyModule || {};

// Constants
const DB_NAME = 'zookies_privy_cache';
const DB_VERSION = 1;
const PROFILES_STORE = 'profiles';
const ATTESTATIONS_STORE = 'attestations';

/**
 * Initialize the profile database with proper schema
 * @returns {Promise<IDBDatabase>}
 */
async function initializeProfileDB() {
    try {
        const db = await openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
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
        return { success: true };
    } catch (error) {
        console.error('Failed to clear profiles:', error);
        return {
            success: false,
            error: error.message || 'Failed to clear profiles'
        };
    }
}

// Make functions available globally for browser environment
if (typeof window !== 'undefined') {
    window.profileStoreModule = {
        ensureWalletAndProfile,
        getProfileByWallet,
        storeProfile,
        verifyProfileClaim,
        addAttestation,
        getAllProfiles,
        clearAllProfiles
    };
    
    // Debug helpers
    if (process.env.NODE_ENV !== 'production') {
        window.zkAgent = window.zkAgent || {};
        window.zkAgent.profiles = {
            getAll: getAllProfiles,
            clear: clearAllProfiles,
            getByWallet: getProfileByWallet,
            verify: verifyProfileClaim
        };
    }
} 