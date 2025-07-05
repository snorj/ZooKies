import { PrivyProvider, useWallets } from '@privy-io/react-auth';
import { openDB } from 'idb';

// Constants
const PRIVY_APP_ID = 'zookies-dev'; // Sandbox environment app ID
const DB_NAME = 'zookies_privy_cache';
const DB_VERSION = 1;
const WALLET_STORE = 'profiles';

// IndexedDB setup
async function initializeDB() {
    try {
        const db = await openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(WALLET_STORE)) {
                    db.createObjectStore(WALLET_STORE, { keyPath: 'wallet' });
                }
            }
        });
        return db;
    } catch (error) {
        console.error('Failed to initialize IndexedDB:', error);
        throw new Error('Failed to initialize profile database');
    }
}

// Updated Privy configuration
export const privyConfig = {
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
export const PRIVY_CONFIG = privyConfig;

/**
 * Initialize Privy SDK with embedded wallet configuration
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function initPrivy() {
    try {
        await initializeDB();
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
 * Get the embedded wallet instance
 * @returns {Promise<{wallet: object|null, error?: string}>}
 */
export async function getEmbeddedWallet() {
    try {
        const { wallets } = useWallets();
        const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');
        
        if (!embeddedWallet) {
            throw new Error('No embedded wallet found');
        }
        
        return { wallet: embeddedWallet };
    } catch (error) {
        console.error('Failed to get embedded wallet:', error);
        return {
            wallet: null,
            error: error.message || 'Failed to get embedded wallet'
        };
    }
}

/**
 * Create a signed profile claim
 * @returns {Promise<{success: boolean, claim?: object, error?: string}>}
 */
export async function createSignedProfileClaim() {
    try {
        const { wallet, error } = await getEmbeddedWallet();
        if (error || !wallet) {
            throw new Error(error || 'No wallet available');
        }

        const timestamp = new Date().toISOString();
        const message = `I confirm this wallet owns my zkAffinity profile. Timestamp: ${timestamp}`;
        
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
            createdAt: Date.now()
        };

        // Store in IndexedDB
        const db = await initializeDB();
        await db.put(WALLET_STORE, claim);

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
 * Get the current profile from storage
 * @returns {Promise<{profile?: object, error?: string}>}
 */
export async function getProfile() {
    try {
        const { wallet, error } = await getEmbeddedWallet();
        if (error || !wallet) {
            throw new Error(error || 'No wallet available');
        }

        const db = await initializeDB();
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
export async function getWalletDebugInfo() {
    try {
        const { wallet, error } = await getEmbeddedWallet();
        if (error || !wallet) {
            throw new Error(error || 'No wallet available');
        }

        return {
            address: wallet.address,
            provider: await wallet.getEthereumProvider()
        };
    } catch (error) {
        console.error('Failed to get wallet debug info:', error);
        return { error: error.message || 'Failed to get wallet debug info' };
    }
}

// Expose debug helper on window object
if (process.env.NODE_ENV !== 'production') {
    window.zkAgent = window.zkAgent || {};
    window.zkAgent.getWallet = getWalletDebugInfo;
} 