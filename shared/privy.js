import { PrivyProvider } from '@privy-io/react-auth';
import { openDB } from 'idb';

// Constants
const PRIVY_APP_ID = 'zookies-dev'; // Sandbox environment app ID
const DB_NAME = 'zookies_privy_cache';
const DB_VERSION = 1;
const WALLET_STORE = 'wallets';

// IndexedDB setup
async function initializeDB() {
    try {
        const db = await openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(WALLET_STORE)) {
                    db.createObjectStore(WALLET_STORE);
                }
            }
        });
        return db;
    } catch (error) {
        console.error('Failed to initialize IndexedDB:', error);
        throw new Error('Failed to initialize wallet cache database');
    }
}

// Privy configuration
const privyConfig = {
    appId: PRIVY_APP_ID,
    embeddedWallets: {
        noPrompt: true, // Enable silent authentication
        createOnLogin: true // Automatically create embedded wallet
    },
    defaultChain: 'ethereum',
    appearance: {
        showWalletConnect: false, // Disable external wallet connections for now
        theme: 'light'
    }
};

/**
 * Initialize Privy SDK with embedded wallet configuration
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function initPrivy() {
    try {
        // Initialize IndexedDB first
        await initializeDB();
        
        // Initialize Privy with configuration
        const privy = new PrivyProvider(privyConfig);
        await privy.init();
        
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
 * Get or create an embedded wallet instance
 * @returns {Promise<{wallet: object|null, error?: string}>}
 */
export async function getPrivyWallet() {
    try {
        const db = await initializeDB();
        
        // Check cache first
        const cachedWallet = await db.get(WALLET_STORE, 'current');
        if (cachedWallet) {
            return { wallet: cachedWallet };
        }
        
        // No cached wallet, create new one
        const privy = new PrivyProvider(privyConfig);
        const wallet = await privy.createEmbeddedWallet();
        
        // Cache the new wallet
        await db.put(WALLET_STORE, wallet, 'current');
        
        return { wallet };
    } catch (error) {
        console.error('Failed to get/create wallet:', error);
        return {
            wallet: null,
            error: error.message || 'Failed to get or create wallet'
        };
    }
}

/**
 * Clear cached wallet data
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function clearWalletCache() {
    try {
        const db = await initializeDB();
        await db.delete(WALLET_STORE, 'current');
        return { success: true };
    } catch (error) {
        console.error('Failed to clear wallet cache:', error);
        return {
            success: false,
            error: error.message || 'Failed to clear wallet cache'
        };
    }
}

/**
 * Check if a wallet is currently connected
 * @returns {Promise<boolean>}
 */
export async function isWalletConnected() {
    try {
        const { wallet } = await getPrivyWallet();
        return Boolean(wallet);
    } catch {
        return false;
    }
}

/**
 * Get the current wallet's address
 * @returns {Promise<{address?: string, error?: string}>}
 */
export async function getWalletAddress() {
    try {
        const { wallet, error } = await getPrivyWallet();
        if (error || !wallet) {
            throw new Error(error || 'No wallet available');
        }
        return { address: wallet.address };
    } catch (error) {
        console.error('Failed to get wallet address:', error);
        return { error: error.message || 'Failed to get wallet address' };
    }
}

/**
 * Handle session restoration after page refresh
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function handleSessionRestore() {
    try {
        const { wallet, error } = await getPrivyWallet();
        if (error || !wallet) {
            throw new Error(error || 'Failed to restore wallet session');
        }
        
        // Verify wallet is still valid and accessible
        const address = await wallet.getAddress();
        if (!address) {
            throw new Error('Invalid wallet state');
        }
        
        return { success: true };
    } catch (error) {
        console.error('Failed to restore session:', error);
        return {
            success: false,
            error: error.message || 'Failed to restore wallet session'
        };
    }
}

// Development logging helper
export function enableDebugLogging() {
    if (process.env.NODE_ENV !== 'production') {
        window._privyDebug = true;
    }
} 