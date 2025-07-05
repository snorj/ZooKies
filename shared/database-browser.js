/**
 * Browser-compatible database module for ZooKies
 * Uses IndexedDB for client-side storage of profiles, attestations, and sessions
 * Provides compatibility with the server-side database interface
 */

import { openDB } from 'idb';

/**
 * Custom error classes for database operations
 */
export class DatabaseError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DatabaseError';
    }
}

export class ValidationError extends DatabaseError {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Browser-compatible database manager using IndexedDB
 * Provides similar interface to the server-side SQLite database
 */
export class BrowserDatabaseManager {
    constructor() {
        this.dbName = 'zookies_privy_cache';
        this.version = 2; // Incremented to support new schema
        this.db = null;
    }

    /**
     * Initialize IndexedDB connection with comprehensive schema
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            this.db = await openDB(this.dbName, this.version, {
                upgrade(db, oldVersion, newVersion, transaction) {
                    console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);

                    // Profiles store - for wallet-bound profiles
                    if (!db.objectStoreNames.contains('profiles')) {
                        const profileStore = db.createObjectStore('profiles', { keyPath: 'wallet' });
                        profileStore.createIndex('createdAt', 'createdAt');
                        profileStore.createIndex('lastUpdated', 'lastUpdated');
                        profileStore.createIndex('isActive', 'isActive');
                    }

                    // Attestations store - for client-side attestation cache
                    if (!db.objectStoreNames.contains('attestations')) {
                        const attestationStore = db.createObjectStore('attestations', { 
                            keyPath: 'id',
                            autoIncrement: true 
                        });
                        attestationStore.createIndex('walletAddress', 'walletAddress');
                        attestationStore.createIndex('tag', 'tag');
                        attestationStore.createIndex('timestamp', 'timestamp');
                        attestationStore.createIndex('publisher', 'publisher');
                        attestationStore.createIndex('nonce', 'nonce', { unique: true });
                    }

                    // Sessions store - for wallet session persistence
                    if (!db.objectStoreNames.contains('sessions')) {
                        const sessionStore = db.createObjectStore('sessions', { keyPath: 'key' });
                        sessionStore.createIndex('walletAddress', 'walletAddress');
                        sessionStore.createIndex('expiresAt', 'expiresAt');
                        sessionStore.createIndex('type', 'type');
                    }

                    // User preferences store - for UI settings and preferences
                    if (!db.objectStoreNames.contains('preferences')) {
                        const prefStore = db.createObjectStore('preferences', { keyPath: 'key' });
                        prefStore.createIndex('category', 'category');
                        prefStore.createIndex('updatedAt', 'updatedAt');
                    }
                }
            });
            
            console.log('Browser database initialized successfully');
        } catch (error) {
            console.error('Failed to initialize browser database:', error);
            throw new DatabaseError(`Failed to initialize browser database: ${error.message}`);
        }
    }

    /**
     * Ensure database is initialized
     * @returns {Promise<void>}
     */
    async ensureInitialized() {
        if (!this.db) {
            await this.initialize();
        }
    }

    /**
     * Store profile with enhanced validation
     * @param {Object} profile - Profile object with wallet address as key
     * @returns {Promise<void>}
     */
    async storeProfile(profile) {
        await this.ensureInitialized();
        
        try {
            // Validate profile structure
            if (!profile.wallet || typeof profile.wallet !== 'string') {
                throw new ValidationError('Profile must have a valid wallet address');
            }

            if (!profile.wallet.startsWith('0x') || profile.wallet.length !== 42) {
                throw new ValidationError('Invalid wallet address format');
            }

            // Add metadata
            const now = Date.now();
            const enhancedProfile = {
                ...profile,
                lastUpdated: now,
                createdAt: profile.createdAt || now,
                isActive: profile.isActive !== false, // Default to true
                version: 1
            };

            await this.db.put('profiles', enhancedProfile);
            console.log('Profile stored in browser database:', profile.wallet);
        } catch (error) {
            if (error instanceof ValidationError) {
            throw error;
            }
            throw new DatabaseError(`Failed to store profile: ${error.message}`);
        }
    }

    /**
     * Get profile by wallet address
     * @param {string} walletAddress - Wallet address
     * @returns {Promise<Object|null>}
     */
    async getProfile(walletAddress) {
        await this.ensureInitialized();
        
        try {
            if (!walletAddress || typeof walletAddress !== 'string') {
                throw new ValidationError('Wallet address is required');
            }

            const profile = await this.db.get('profiles', walletAddress);
            return profile || null;
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new DatabaseError(`Failed to get profile: ${error.message}`);
        }
    }

    /**
     * Store attestation with validation
     * @param {Object} attestation - Attestation object
     * @returns {Promise<number>} - Attestation ID
     */
    async storeAttestation(attestation) {
        await this.ensureInitialized();
        
        try {
            // Validate attestation structure
            const requiredFields = ['tag', 'timestamp', 'nonce', 'signature', 'publisher', 'user_wallet'];
            for (const field of requiredFields) {
                if (!attestation[field]) {
                    throw new ValidationError(`Missing required field: ${field}`);
                }
            }

            // Validate tag
            const allowedTags = ['finance', 'privacy', 'travel', 'gaming'];
            if (!allowedTags.includes(attestation.tag)) {
                throw new ValidationError(`Invalid tag: ${attestation.tag}`);
            }

            // Validate wallet address
            if (!attestation.user_wallet.startsWith('0x') || attestation.user_wallet.length !== 42) {
                throw new ValidationError('Invalid wallet address format');
            }

            // Add metadata
            const enhancedAttestation = {
                ...attestation,
                walletAddress: attestation.user_wallet, // For index compatibility
                storedAt: Date.now(),
                verified: false // Will be set to true after verification
            };

            const id = await this.db.add('attestations', enhancedAttestation);
            console.log('Attestation stored in browser database with ID:', id);
            return id;
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new DatabaseError(`Failed to store attestation: ${error.message}`);
        }
    }

    /**
     * Get attestations by wallet address and optional tag
     * @param {string} walletAddress - Wallet address
     * @param {string} tag - Optional tag filter
     * @returns {Promise<Array>}
     */
    async getAttestations(walletAddress, tag = null) {
        await this.ensureInitialized();
        
        try {
            if (!walletAddress || typeof walletAddress !== 'string') {
                throw new ValidationError('Wallet address is required');
            }

            const tx = this.db.transaction('attestations', 'readonly');
            const store = tx.objectStore('attestations');
            const index = store.index('walletAddress');
            
            let attestations = await index.getAll(walletAddress);
            
            if (tag) {
                attestations = attestations.filter(att => att.tag === tag);
            }
            
            // Sort by timestamp (newest first)
            return attestations.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new DatabaseError(`Failed to get attestations: ${error.message}`);
        }
    }

    /**
     * Store session data with expiration
     * @param {string} key - Session key
     * @param {Object} data - Session data
     * @param {number} expiresAt - Expiration timestamp (optional)
     * @returns {Promise<void>}
     */
    async storeSession(key, data, expiresAt = null) {
        await this.ensureInitialized();
        
        try {
            if (!key || typeof key !== 'string') {
                throw new ValidationError('Session key is required');
            }

            const session = {
                key,
                data,
                expiresAt: expiresAt || (Date.now() + (24 * 60 * 60 * 1000)), // 24 hours default
                createdAt: Date.now(),
                type: data.type || 'general',
                walletAddress: data.walletAddress || null
            };

            await this.db.put('sessions', session);
            console.log('Session stored:', key);
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new DatabaseError(`Failed to store session: ${error.message}`);
        }
    }

    /**
     * Get session data with expiration check
     * @param {string} key - Session key
     * @returns {Promise<Object|null>}
     */
    async getSession(key) {
        await this.ensureInitialized();
        
        try {
            if (!key || typeof key !== 'string') {
                throw new ValidationError('Session key is required');
            }

            const session = await this.db.get('sessions', key);
            
            if (!session) return null;
            
            // Check if session has expired
            if (session.expiresAt && Date.now() > session.expiresAt) {
                await this.db.delete('sessions', key);
                console.log('Expired session removed:', key);
                return null;
            }
            
            return session.data;
        } catch (error) {
            if (error instanceof ValidationError) {
            throw error;
            }
            throw new DatabaseError(`Failed to get session: ${error.message}`);
        }
    }

    /**
     * Store user preference
     * @param {string} key - Preference key
     * @param {any} value - Preference value
     * @param {string} category - Preference category (optional)
     * @returns {Promise<void>}
     */
    async storePreference(key, value, category = 'general') {
        await this.ensureInitialized();
        
        try {
            const preference = {
                key,
                value,
                category,
                updatedAt: Date.now()
            };

            await this.db.put('preferences', preference);
        } catch (error) {
            throw new DatabaseError(`Failed to store preference: ${error.message}`);
        }
    }

    /**
     * Get user preference
     * @param {string} key - Preference key
     * @param {any} defaultValue - Default value if not found
     * @returns {Promise<any>}
     */
    async getPreference(key, defaultValue = null) {
        await this.ensureInitialized();
        
        try {
            const preference = await this.db.get('preferences', key);
            return preference ? preference.value : defaultValue;
        } catch (error) {
            throw new DatabaseError(`Failed to get preference: ${error.message}`);
        }
    }

    /**
     * Clear expired sessions
     * @returns {Promise<number>} - Number of sessions cleared
     */
    async clearExpiredSessions() {
        await this.ensureInitialized();
        
        try {
            const tx = this.db.transaction('sessions', 'readwrite');
            const store = tx.objectStore('sessions');
            const index = store.index('expiresAt');
            
            const now = Date.now();
            const expiredSessions = await index.getAll(IDBKeyRange.upperBound(now));
            
            for (const session of expiredSessions) {
                await store.delete(session.key);
            }
            
            await tx.done;
            console.log(`Cleared ${expiredSessions.length} expired sessions`);
            return expiredSessions.length;
        } catch (error) {
            throw new DatabaseError(`Failed to clear expired sessions: ${error.message}`);
        }
    }

    /**
     * Get all profiles (for debugging/admin use)
     * @returns {Promise<Array>}
     */
    async getAllProfiles() {
        await this.ensureInitialized();
        
        try {
            const profiles = await this.db.getAll('profiles');
            return profiles.sort((a, b) => b.lastUpdated - a.lastUpdated);
        } catch (error) {
            throw new DatabaseError(`Failed to get all profiles: ${error.message}`);
        }
    }

    /**
     * Get database statistics
     * @returns {Promise<Object>}
     */
    async getStats() {
        await this.ensureInitialized();
        
        try {
            const [profiles, attestations, sessions] = await Promise.all([
                this.db.count('profiles'),
                this.db.count('attestations'),
                this.db.count('sessions')
            ]);

            return {
                profiles,
                attestations,
                sessions,
                lastUpdated: Date.now()
            };
        } catch (error) {
            throw new DatabaseError(`Failed to get database stats: ${error.message}`);
        }
    }

    /**
     * Clear all data (for testing/reset)
     * @param {Array} stores - Optional array of store names to clear (default: all)
     * @returns {Promise<void>}
     */
    async clearAll(stores = ['profiles', 'attestations', 'sessions', 'preferences']) {
        await this.ensureInitialized();
        
        try {
            const tx = this.db.transaction(stores, 'readwrite');
            const clearPromises = stores.map(storeName => 
                tx.objectStore(storeName).clear()
            );
            
            await Promise.all(clearPromises);
            await tx.done;
            
            console.log('Browser database cleared:', stores);
        } catch (error) {
            throw new DatabaseError(`Failed to clear browser database: ${error.message}`);
        }
    }

    /**
     * Close database connection
     * @returns {Promise<void>}
     */
    async close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('Browser database connection closed');
        }
    }
}

// Create singleton instance for browser use
let browserDB = null;

/**
 * Get singleton browser database instance
 * @returns {BrowserDatabaseManager}
 */
export function getBrowserDatabase() {
    if (!browserDB) {
        browserDB = new BrowserDatabaseManager();
    }
    return browserDB;
}

// Debug helpers for development
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    window.zkAgent = window.zkAgent || {};
    window.zkAgent.browserDB = {
        getInstance: getBrowserDatabase,
        getStats: () => getBrowserDatabase().getStats(),
        clearAll: () => getBrowserDatabase().clearAll(),
        getAllProfiles: () => getBrowserDatabase().getAllProfiles()
    };
} 