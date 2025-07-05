/**
 * Database module for SQLite operations
 * Enhanced with cryptographic signature verification and comprehensive attestation management
 * Handles attestation storage, user profile management, and signature validation
 * Now includes IndexedDB wrapper for browser-side profile storage
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { PublisherSigner } = require('./cryptography.js');
const { PUBLISHER_KEYS } = require('./publisher-keys.js');

// Browser-side IndexedDB support
let idb = null;
if (typeof window !== 'undefined') {
    // Dynamically import idb for browser environments
    try {
        idb = require('idb');
    } catch (err) {
        console.warn('IndexedDB not available:', err);
    }
}

/**
 * Custom error classes for database operations
 */
class DatabaseError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DatabaseError';
    }
}

class ValidationError extends DatabaseError {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * IndexedDB wrapper for browser-side profile storage
 * Provides similar interface to SQLite for profiles and attestations
 */
class IndexedDBWrapper {
    constructor() {
        this.dbName = 'zookies_privy_cache';
        this.version = 1;
        this.db = null;
    }

    /**
     * Initialize IndexedDB connection
     * @returns {Promise<void>}
     */
    async initialize() {
        if (!idb || typeof window === 'undefined') {
            throw new DatabaseError('IndexedDB not available in this environment');
        }

        try {
            this.db = await idb.openDB(this.dbName, this.version, {
                upgrade(db) {
                    // Profiles store - for wallet-bound profiles
                    if (!db.objectStoreNames.contains('profiles')) {
                        const profileStore = db.createObjectStore('profiles', { keyPath: 'wallet' });
                        profileStore.createIndex('createdAt', 'createdAt');
                        profileStore.createIndex('lastUpdated', 'lastUpdated');
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
                    }

                    // Sessions store - for wallet session persistence
                    if (!db.objectStoreNames.contains('sessions')) {
                        const sessionStore = db.createObjectStore('sessions', { keyPath: 'key' });
                        sessionStore.createIndex('walletAddress', 'walletAddress');
                        sessionStore.createIndex('expiresAt', 'expiresAt');
                    }
                }
            });
            
            console.log('IndexedDB initialized successfully');
        } catch (error) {
            console.error('Failed to initialize IndexedDB:', error);
            throw new DatabaseError(`Failed to initialize IndexedDB: ${error.message}`);
        }
    }

    /**
     * Store profile in IndexedDB
     * @param {Object} profile - Profile object with wallet address as key
     * @returns {Promise<void>}
     */
    async storeProfile(profile) {
        if (!this.db) await this.initialize();
        
        try {
            profile.lastUpdated = Date.now();
            await this.db.put('profiles', profile);
            console.log('Profile stored in IndexedDB:', profile.wallet);
        } catch (error) {
            throw new DatabaseError(`Failed to store profile: ${error.message}`);
        }
    }

    /**
     * Get profile by wallet address
     * @param {string} walletAddress - Wallet address
     * @returns {Promise<Object|null>}
     */
    async getProfile(walletAddress) {
        if (!this.db) await this.initialize();
        
        try {
            const profile = await this.db.get('profiles', walletAddress);
            return profile || null;
        } catch (error) {
            throw new DatabaseError(`Failed to get profile: ${error.message}`);
        }
    }

    /**
     * Store attestation in IndexedDB
     * @param {Object} attestation - Attestation object
     * @returns {Promise<number>} - Attestation ID
     */
    async storeAttestation(attestation) {
        if (!this.db) await this.initialize();
        
        try {
            const id = await this.db.add('attestations', {
                ...attestation,
                storedAt: Date.now()
            });
            console.log('Attestation stored in IndexedDB with ID:', id);
            return id;
        } catch (error) {
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
        if (!this.db) await this.initialize();
        
        try {
            const tx = this.db.transaction('attestations', 'readonly');
            const store = tx.objectStore('attestations');
            const index = store.index('walletAddress');
            
            let attestations = await index.getAll(walletAddress);
            
            if (tag) {
                attestations = attestations.filter(att => att.tag === tag);
            }
            
            return attestations.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            throw new DatabaseError(`Failed to get attestations: ${error.message}`);
        }
    }

    /**
     * Store session data
     * @param {string} key - Session key
     * @param {Object} data - Session data
     * @param {number} expiresAt - Expiration timestamp
     * @returns {Promise<void>}
     */
    async storeSession(key, data, expiresAt = null) {
        if (!this.db) await this.initialize();
        
        try {
            await this.db.put('sessions', {
                key,
                data,
                expiresAt: expiresAt || (Date.now() + (24 * 60 * 60 * 1000)), // 24 hours default
                createdAt: Date.now()
            });
        } catch (error) {
            throw new DatabaseError(`Failed to store session: ${error.message}`);
        }
    }

    /**
     * Get session data
     * @param {string} key - Session key
     * @returns {Promise<Object|null>}
     */
    async getSession(key) {
        if (!this.db) await this.initialize();
        
        try {
            const session = await this.db.get('sessions', key);
            
            if (!session) return null;
            
            // Check if session has expired
            if (session.expiresAt && Date.now() > session.expiresAt) {
                await this.db.delete('sessions', key);
                return null;
            }
            
            return session.data;
        } catch (error) {
            throw new DatabaseError(`Failed to get session: ${error.message}`);
        }
    }

    /**
     * Clear expired sessions
     * @returns {Promise<number>} - Number of sessions cleared
     */
    async clearExpiredSessions() {
        if (!this.db) await this.initialize();
        
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
            return expiredSessions.length;
        } catch (error) {
            throw new DatabaseError(`Failed to clear expired sessions: ${error.message}`);
        }
    }

    /**
     * Clear all data (for testing/reset)
     * @returns {Promise<void>}
     */
    async clearAll() {
        if (!this.db) await this.initialize();
        
        try {
            const tx = this.db.transaction(['profiles', 'attestations', 'sessions'], 'readwrite');
            await Promise.all([
                tx.objectStore('profiles').clear(),
                tx.objectStore('attestations').clear(),
                tx.objectStore('sessions').clear()
            ]);
            await tx.done;
            console.log('All IndexedDB data cleared');
        } catch (error) {
            throw new DatabaseError(`Failed to clear IndexedDB: ${error.message}`);
        }
    }
}

class DatabaseManager {
    constructor() {
        this.dbPath = path.join(__dirname, '../database/zookies.db');
        this.db = null;
    }

    /**
     * Initialize database connection and verify tables exist
     * @returns {Promise<void>}
     */
    async initializeDatabase() {
        await this.connect();
        await this.verifyTablesExist();
    }

    /**
     * Establish database connection
     * @returns {Promise<void>}
     */
    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Database connection error:', err.message);
                    reject(new DatabaseError(`Failed to connect to database: ${err.message}`));
                } else {
                    console.log('Connected to SQLite database:', this.dbPath);
                    resolve();
                }
            });
        });
    }

    /**
     * Verify that required tables exist in the database
     * @returns {Promise<void>}
     */
    async verifyTablesExist() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name IN ('attestations', 'user_profiles')
            `;

            this.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(new DatabaseError(`Failed to verify tables: ${err.message}`));
                } else if (rows.length !== 2) {
                    reject(new DatabaseError('Required tables not found. Please run database initialization.'));
                } else {
                    console.log('Database tables verified successfully');
                    resolve();
                }
            });
        });
    }

    /**
     * Close database connection
     * @returns {Promise<void>}
     */
    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err.message);
                        reject(err);
                    } else {
                        console.log('Database connection closed');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * Store attestation in database with enhanced validation
     * @param {Object} attestation - Complete attestation object from cryptography module
     * @param {string} attestation.tag - Tag category (finance, privacy, travel, gaming)
     * @param {number} attestation.timestamp - Unix timestamp
     * @param {string} attestation.nonce - UUID nonce
     * @param {string} attestation.signature - ECDSA signature
     * @param {string} attestation.publisher - Publisher domain
     * @param {string} attestation.user_wallet - User's wallet address
     * @returns {Promise<number>} - Attestation ID
     */
    async storeAttestation(attestation) {
        // Validate required fields
        const requiredFields = ['tag', 'timestamp', 'nonce', 'signature', 'publisher', 'user_wallet'];
        for (const field of requiredFields) {
            if (!attestation[field]) {
                throw new ValidationError(`Missing required field: ${field}`);
            }
        }

        // Validate tag is allowed
        const allowedTags = ['finance', 'privacy', 'travel', 'gaming'];
        if (!allowedTags.includes(attestation.tag)) {
            throw new ValidationError(`Invalid tag: ${attestation.tag}. Must be one of: ${allowedTags.join(', ')}`);
        }

        // Validate wallet address format
        if (!attestation.user_wallet.startsWith('0x') || attestation.user_wallet.length !== 42) {
            throw new ValidationError('Invalid wallet address format');
        }

        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO attestations (tag, timestamp, nonce, signature, publisher, user_wallet)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [
                attestation.tag,
                attestation.timestamp,
                attestation.nonce,
                attestation.signature,
                attestation.publisher,
                attestation.user_wallet
            ], function(err) {
                if (err) {
                    console.error('Error storing attestation:', err.message);
                    reject(new DatabaseError(`Failed to store attestation: ${err.message}`));
                } else {
                    console.log('Attestation stored with ID:', this.lastID);
                    resolve(this.lastID);
                }
            });
        });
    }

    /**
     * Verify attestation signature and store if valid
     * @param {Object} attestation - Complete attestation object
     * @returns {Promise<number>} - Attestation ID if stored successfully
     */
    async verifyAndStoreAttestation(attestation) {
        try {
            // Validate attestation structure
            if (!attestation || typeof attestation !== 'object') {
                throw new ValidationError('Attestation must be an object');
            }

            // Check if publisher exists in our keys
            if (!PUBLISHER_KEYS[attestation.publisher]) {
                throw new ValidationError(`Unknown publisher: ${attestation.publisher}`);
            }

            // Get publisher's public key for verification
            const publisherKeys = PUBLISHER_KEYS[attestation.publisher];
            const publisherAddress = publisherKeys.address || 
                require('ethers').utils.computeAddress(publisherKeys.publicKey);

            // Verify the signature
            const isValid = PublisherSigner.verifyAttestation(attestation, publisherAddress);
            
            if (!isValid) {
                throw new ValidationError('Invalid attestation signature');
            }

            // Store the verified attestation
            return await this.storeAttestation(attestation);

        } catch (error) {
            if (error instanceof ValidationError || error instanceof DatabaseError) {
                throw error;
            }
            throw new DatabaseError(`Attestation verification failed: ${error.message}`);
        }
    }

    /**
     * Retrieve attestations by wallet address
     * @param {string} walletAddress - User's wallet address
     * @param {string} [tag] - Optional tag filter
     * @returns {Promise<Array>} - Array of attestations
     */
    async getAttestations(walletAddress, tag = null) {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT id, tag, timestamp, nonce, signature, publisher, user_wallet, created_at
                FROM attestations
                WHERE user_wallet = ?
            `;
            const params = [walletAddress];

            if (tag) {
                query += ' AND tag = ?';
                params.push(tag);
            }

            query += ' ORDER BY created_at DESC';

            this.db.all(query, params, (err, rows) => {
                if (err) {
                    console.error('Error retrieving attestations:', err.message);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * Get user profile by wallet address
     * @param {string} walletAddress - User's wallet address
     * @returns {Promise<Object|null>} - User profile or null if not found
     */
    async getUserProfile(walletAddress) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT wallet_address, signed_profile_claim, self_proof, created_at, updated_at
                FROM user_profiles
                WHERE wallet_address = ?
            `;

            this.db.get(query, [walletAddress], (err, row) => {
                if (err) {
                    console.error('Error retrieving user profile:', err.message);
                    reject(err);
                } else {
                    resolve(row || null);
                }
            });
        });
    }

    /**
     * Create or update user profile
     * @param {Object} profile - User profile data
     * @param {string} profile.walletAddress - User's wallet address
     * @param {string} profile.signedProfileClaim - JSON string of signed message
     * @param {string} profile.selfProof - JSON string of Self identity proof
     * @returns {Promise<boolean>} - Success status
     */
    async upsertUserProfile(profile) {
        const { walletAddress, signedProfileClaim, selfProof } = profile;

        return new Promise((resolve, reject) => {
            const query = `
                INSERT OR REPLACE INTO user_profiles (wallet_address, signed_profile_claim, self_proof, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `;

            this.db.run(query, [walletAddress, signedProfileClaim, selfProof], function(err) {
                if (err) {
                    console.error('Error upserting user profile:', err.message);
                    reject(err);
                } else {
                    console.log('User profile updated for wallet:', walletAddress);
                    resolve(true);
                }
            });
        });
    }

    /**
     * Get all attestations for a wallet address (alias for getAttestations)
     * @param {string} walletAddress - User's wallet address
     * @returns {Promise<Array>} - Array of all attestations for the user
     */
    async getAllAttestations(walletAddress) {
        if (!walletAddress || typeof walletAddress !== 'string') {
            throw new ValidationError('Wallet address is required and must be a string');
        }

        if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
            throw new ValidationError('Invalid wallet address format');
        }

        return await this.getAttestations(walletAddress);
    }

    /**
     * Reset user profile and all associated attestations (complete data cleanup)
     * @param {string} walletAddress - User's wallet address
     * @returns {Promise<Object>} - Object with deletion counts
     */
    async resetUserProfile(walletAddress) {
        if (!walletAddress || typeof walletAddress !== 'string') {
            throw new ValidationError('Wallet address is required and must be a string');
        }

        if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
            throw new ValidationError('Invalid wallet address format');
        }

        const db = this.db; // Capture database reference
        
        return new Promise((resolve, reject) => {
            // Use transaction to ensure atomicity
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                let attestationsDeleted = 0;
                let profileDeleted = 0;

                // Delete attestations first
                db.run(
                    'DELETE FROM attestations WHERE user_wallet = ?',
                    [walletAddress],
                    function(err) {
                        if (err) {
                            db.run('ROLLBACK');
                            reject(new DatabaseError(`Failed to delete attestations: ${err.message}`));
                            return;
                        }
                        attestationsDeleted = this.changes;

                        // Delete user profile
                        db.run(
                            'DELETE FROM user_profiles WHERE wallet_address = ?',
                            [walletAddress],
                            function(err) {
                                if (err) {
                                    db.run('ROLLBACK');
                                    reject(new DatabaseError(`Failed to delete user profile: ${err.message}`));
                                    return;
                                }
                                profileDeleted = this.changes;

                                // Commit transaction
                                db.run('COMMIT', function(err) {
                                    if (err) {
                                        reject(new DatabaseError(`Transaction commit failed: ${err.message}`));
                                    } else {
                                        console.log(`Reset complete for ${walletAddress}: ${attestationsDeleted} attestations, ${profileDeleted} profile deleted`);
                                        resolve({
                                            success: true,
                                            attestationsDeleted,
                                            profileDeleted,
                                            walletAddress
                                        });
                                    }
                                });
                            }
                        );
                    }
                );
            });
        });
    }

    /**
     * Get attestation statistics
     * @returns {Promise<Object>} - Statistics object
     */
    async getAttestationStats() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    COUNT(*) as total_attestations,
                    COUNT(DISTINCT user_wallet) as unique_users,
                    COUNT(DISTINCT publisher) as publishers,
                    tag,
                    COUNT(*) as count
                FROM attestations
                GROUP BY tag
            `;

            this.db.all(query, [], (err, rows) => {
                if (err) {
                    console.error('Error getting attestation stats:', err.message);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * Clean up old attestations (older than specified days)
     * @param {number} days - Days to keep attestations
     * @returns {Promise<number>} - Number of deleted records
     */
    async cleanupOldAttestations(days = 30) {
        return new Promise((resolve, reject) => {
            const cutoffTimestamp = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
            const query = `DELETE FROM attestations WHERE timestamp < ?`;

            this.db.run(query, [cutoffTimestamp], function(err) {
                if (err) {
                    console.error('Error cleaning up old attestations:', err.message);
                    reject(err);
                } else {
                    console.log(`Cleaned up ${this.changes} old attestations`);
                    resolve(this.changes);
                }
            });
        });
    }
}

/**
 * Enhanced database manager with transaction support
 */
class EnhancedDatabaseManager extends DatabaseManager {
    /**
     * Execute database operations within a transaction
     * @param {Function} operations - Async function containing database operations
     * @returns {Promise<any>} - Result of the operations
     */
    async withTransaction(operations) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');

                operations()
                    .then(result => {
                        this.db.run('COMMIT', (err) => {
                            if (err) {
                                this.db.run('ROLLBACK');
                                reject(new DatabaseError(`Transaction commit failed: ${err.message}`));
                            } else {
                                resolve(result);
                            }
                        });
                    })
                    .catch(error => {
                        this.db.run('ROLLBACK');
                        reject(error);
                    });
            });
        });
    }

    /**
     * Batch store multiple attestations within a transaction
     * @param {Array} attestations - Array of attestation objects
     * @returns {Promise<Array>} - Array of attestation IDs
     */
    async batchStoreAttestations(attestations) {
        if (!Array.isArray(attestations) || attestations.length === 0) {
            throw new ValidationError('Attestations must be a non-empty array');
        }

        return await this.withTransaction(async () => {
            const ids = [];
            for (const attestation of attestations) {
                const id = await this.storeAttestation(attestation);
                ids.push(id);
            }
            return ids;
        });
    }

    /**
     * Get comprehensive user profile with attestation statistics
     * @param {string} walletAddress - User's wallet address
     * @returns {Promise<Object>} - Complete user profile with stats
     */
    async getCompleteUserProfile(walletAddress) {
        if (!walletAddress || typeof walletAddress !== 'string') {
            throw new ValidationError('Wallet address is required and must be a string');
        }

        const [profile, attestations] = await Promise.all([
            this.getUserProfile(walletAddress),
            this.getAllAttestations(walletAddress)
        ]);

        // Calculate statistics
        const stats = {
            totalAttestations: attestations.length,
            tags: {},
            publishers: new Set(),
            firstAttestation: null,
            lastAttestation: null
        };

        attestations.forEach(attestation => {
            // Count tags
            stats.tags[attestation.tag] = (stats.tags[attestation.tag] || 0) + 1;
            
            // Track publishers
            stats.publishers.add(attestation.publisher);
            
            // Track timestamps
            if (!stats.firstAttestation || attestation.timestamp < stats.firstAttestation) {
                stats.firstAttestation = attestation.timestamp;
            }
            if (!stats.lastAttestation || attestation.timestamp > stats.lastAttestation) {
                stats.lastAttestation = attestation.timestamp;
            }
        });

        stats.publishers = Array.from(stats.publishers);

        return {
            profile,
            attestations,
            stats,
            walletAddress
        };
    }
}

module.exports = { 
    DatabaseManager: EnhancedDatabaseManager,
    IndexedDBWrapper,
    DatabaseError,
    ValidationError
}; 