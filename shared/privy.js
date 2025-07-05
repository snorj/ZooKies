// Browser-compatible Privy integration for ZooKies
// Falls back to temporary wallet generation when Privy modules are not available

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Try to import Privy modules, fall back gracefully if not available
let PrivyProvider, useWallets;
let privyAvailable = false;

try {
    // Dynamic import for Privy modules (will fail gracefully)
    if (isBrowser) {
        // Note: These imports will fail in most cases since Privy isn't installed
        // We'll catch the error and use fallback wallet generation
        import('@privy-io/react-auth').then(module => {
            PrivyProvider = module.PrivyProvider;
            useWallets = module.useWallets;
            privyAvailable = true;
            console.log('Privy modules loaded successfully');
        }).catch(err => {
            console.warn('Privy modules not available, using fallback wallet generation:', err.message);
            privyAvailable = false;
        });
    }
} catch (error) {
    console.warn('Privy import failed, using fallback wallet generation:', error.message);
    privyAvailable = false;
}

// Initialize global variables with fallback for missing dependencies
let ethers, openDBRef;

try {
    // Try to access ethers from global scope
    ethers = window.ethers;
    if (!ethers) {
        console.warn('Ethers.js not available, some wallet operations may fail');
    }

    // Try to access IndexedDB helper (avoid conflicts with existing openDB)
    if (window.idb && window.idb.openDB && typeof window.openDB === 'undefined') {
        openDBRef = window.idb.openDB;
    } else if (window.idb && window.idb.openDB) {
        openDBRef = window.idb.openDB;
    }
    
} catch (error) {
    console.warn('Privy modules not available, using fallback wallet generation:', error.message);
}

// Constants
const PRIVY_APP_ID = 'zookies-dev'; // Sandbox environment app ID
const DB_NAME = 'zookies_privy_cache';
const DB_VERSION = 1;
const WALLET_STORE = 'profiles';

// Global wallet storage key - same across all sites
const GLOBAL_WALLET_KEY = 'zookies_global_wallet';

// Fallback wallet generation using ethers.js
function generateTemporaryWallet() {
    if (typeof window !== 'undefined' && window.ethers) {
        const wallet = window.ethers.Wallet.createRandom();
        console.log('Generated new global wallet:', wallet.address);
        return {
            address: wallet.address,
            privateKey: wallet.privateKey,
            getEthereumProvider: () => ({
                request: async ({ method, params }) => {
                    if (method === 'personal_sign') {
                        const [message, address] = params;
                        return wallet.signMessage(message);
                    }
                    throw new Error(`Unsupported method: ${method}`);
                }
            }),
            walletClientType: 'zookies-global',
            isConnected: true
        };
    }
    throw new Error('Ethers.js not available for wallet generation');
}

// IndexedDB setup
async function initializeDB() {
    if (!openDBRef) {
        console.warn('IndexedDB not available, using in-memory storage');
        return null;
    }
    
    try {
        const db = await openDBRef(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(WALLET_STORE)) {
                    db.createObjectStore(WALLET_STORE, { keyPath: 'wallet' });
                }
            }
        });
        return db;
    } catch (error) {
        console.error('Failed to initialize IndexedDB:', error);
        return null;
    }
}

// Updated Privy configuration
const privyConfig = {
    appId: PRIVY_APP_ID,
    embeddedWallets: {
        ethereum: {
            createOnLogin: 'users-without-wallets', // Create wallet on first login
            showWalletUIs: false // No popups
        }
    },
    appearance: {
        theme: 'light',
        accentColor: '#4F46E5' // Indigo to match ZooKies theme
    }
};

// Alternative export name for compatibility
const PRIVY_CONFIG = privyConfig;

/**
 * Initialize Privy SDK with embedded wallet configuration
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function initPrivy() {
    try {
        await initializeDB();
        
        if (!privyAvailable) {
            console.log('Privy not available, using global wallet generation');
        }
        
        return { success: true };
    } catch (error) {
        console.error('Failed to initialize Privy:', error);
        return {
            success: false,
            error: error.message || 'Failed to initialize Privy SDK'
        };
    }
}

/**
 * Get or create the global wallet that persists across all sites
 * @returns {Promise<{wallet: object|null, error?: string}>}
 */
async function getEmbeddedWallet() {
    try {
        // Try to use Privy if available
        if (privyAvailable && useWallets) {
            const { wallets } = useWallets();
            const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');
            
            if (embeddedWallet) {
                console.log('Using Privy embedded wallet:', embeddedWallet.address);
                return { wallet: embeddedWallet };
            }
        }
        
        // Fall back to global wallet generation
        console.log('Using global wallet generation for ZooKies');
        
        // Try to get existing global wallet from localStorage
        if (typeof localStorage !== 'undefined') {
            const existingWallet = localStorage.getItem(GLOBAL_WALLET_KEY);
            
            if (existingWallet) {
                const walletData = JSON.parse(existingWallet);
                console.log('Using existing global wallet:', walletData.address);
                
                // Recreate wallet from stored private key
                if (window.ethers) {
                    const wallet = new window.ethers.Wallet(walletData.privateKey);
                    return {
                        wallet: {
                            address: wallet.address,
                            privateKey: wallet.privateKey,
                            getEthereumProvider: () => ({
                                request: async ({ method, params }) => {
                                    if (method === 'personal_sign') {
                                        const [message, address] = params;
                                        return wallet.signMessage(message);
                                    }
                                    throw new Error(`Unsupported method: ${method}`);
                                }
                            }),
                            walletClientType: 'zookies-global',
                            isConnected: true
                        }
                    };
                }
            }
        }
        
        // Generate new global wallet if none exists
        const newWallet = generateTemporaryWallet();
        
        // Store globally for all sites
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(GLOBAL_WALLET_KEY, JSON.stringify({
                address: newWallet.address,
                privateKey: newWallet.privateKey,
                createdAt: Date.now(),
                version: '1.0'
            }));
            console.log('Global wallet stored for all ZooKies sites');
        }
        
        return { wallet: newWallet };
    } catch (error) {
        console.error('Failed to get embedded wallet:', error);
        return {
            wallet: null,
            error: error.message || 'Failed to get embedded wallet'
        };
    }
}

/**
 * Create a signed profile claim for the global wallet
 * @returns {Promise<{success: boolean, claim?: object, error?: string}>}
 */
async function createSignedProfileClaim() {
    try {
        const { wallet, error } = await getEmbeddedWallet();
        if (error || !wallet) {
            throw new Error(error || 'No wallet available');
        }

        const timestamp = new Date().toISOString();
        const message = `I confirm this wallet owns my ZooKies interest profile across all sites. Timestamp: ${timestamp}`;
        
        const provider = await wallet.getEthereumProvider();
        const signature = await provider.request({
            method: 'personal_sign',
            params: [message, wallet.address]
        });

        const claim = {
            wallet: wallet.address,
            signedProfileClaim: {
                message,
                signature
            },
            attestations: [],
            selfProof: null,
            createdAt: Date.now(),
            version: '1.0'
        };

        // Store in IndexedDB if available
        const db = await initializeDB();
        if (db) {
            await db.put(WALLET_STORE, claim);
            console.log('Global profile claim stored in IndexedDB');
        }

        return { success: true, claim };
    } catch (error) {
        console.error('Failed to create signed profile claim:', error);
        return {
            success: false,
            error: error.message || 'Failed to create signed profile claim'
        };
    }
}

/**
 * Get the current global profile from storage
 * @returns {Promise<{profile?: object, error?: string}>}
 */
async function getProfile() {
    try {
        const { wallet, error } = await getEmbeddedWallet();
        if (error || !wallet) {
            throw new Error(error || 'No wallet available');
        }

        const db = await initializeDB();
        if (!db) {
            return { profile: null };
        }
        
        const profile = await db.get(WALLET_STORE, wallet.address);
        return { profile };
    } catch (error) {
        console.error('Failed to get profile:', error);
        return { error: error.message || 'Failed to get profile' };
    }
}

/**
 * Debug helper to expose wallet information
 * @returns {Promise<{address?: string, provider?: object, error?: string}>}
 */
async function getWalletDebugInfo() {
    try {
        const { wallet, error } = await getEmbeddedWallet();
        if (error || !wallet) {
            throw new Error(error || 'No wallet available');
        }

        return {
            address: wallet.address,
            provider: await wallet.getEthereumProvider(),
            type: wallet.walletClientType || 'unknown',
            isGlobal: wallet.walletClientType === 'zookies-global'
        };
    } catch (error) {
        console.error('Failed to get wallet debug info:', error);
        return { error: error.message || 'Failed to get wallet debug info' };
    }
}

// Expose main functions on window object
if (typeof window !== 'undefined') {
    // Main Privy functions
    window.privyConfig = privyConfig;
    window.PRIVY_CONFIG = PRIVY_CONFIG;
    window.initPrivy = initPrivy;
    window.getEmbeddedWallet = getEmbeddedWallet;
    window.createSignedProfileClaim = createSignedProfileClaim;
    window.getProfile = getProfile;
    window.getWalletDebugInfo = getWalletDebugInfo;
    
    // Debug helpers
    window.zkAgent = window.zkAgent || {};
    window.zkAgent.getWallet = getWalletDebugInfo;
    window.zkAgent.privyAvailable = () => privyAvailable;
    window.zkAgent.clearGlobalWallet = () => {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(GLOBAL_WALLET_KEY);
            console.log('Global wallet cleared - will regenerate on next use');
        }
    };
} 