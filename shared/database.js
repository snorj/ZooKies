/**
 * Database module for SQLite operations
 * Handles attestation storage and user profile management
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class DatabaseManager {
    constructor() {
        this.dbPath = path.join(__dirname, '../database/zookies.db');
        this.db = null;
    }

    /**
     * Initialize database connection
     * @returns {Promise<void>}
     */
    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Database connection error:', err.message);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database:', this.dbPath);
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
     * Store attestation in database
     * @param {Object} attestation - Attestation data
     * @param {string} attestation.tag - Tag category (finance, privacy, travel, gaming)
     * @param {string} attestation.signature - ECDSA signature
     * @param {string} attestation.publisher - Publisher domain
     * @param {string} attestation.userWallet - User's wallet address
     * @returns {Promise<number>} - Attestation ID
     */
    async storeAttestation(attestation) {
        const { tag, signature, publisher, userWallet } = attestation;
        const timestamp = Math.floor(Date.now() / 1000);
        const nonce = uuidv4();

        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO attestations (tag, timestamp, nonce, signature, publisher, user_wallet)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [tag, timestamp, nonce, signature, publisher, userWallet], function(err) {
                if (err) {
                    console.error('Error storing attestation:', err.message);
                    reject(err);
                } else {
                    console.log('Attestation stored with ID:', this.lastID);
                    resolve(this.lastID);
                }
            });
        });
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
     * Reset user profile (delete from database)
     * @param {string} walletAddress - User's wallet address
     * @returns {Promise<boolean>} - Success status
     */
    async resetUserProfile(walletAddress) {
        return new Promise((resolve, reject) => {
            const query = `DELETE FROM user_profiles WHERE wallet_address = ?`;

            this.db.run(query, [walletAddress], function(err) {
                if (err) {
                    console.error('Error resetting user profile:', err.message);
                    reject(err);
                } else {
                    console.log('User profile reset for wallet:', walletAddress);
                    resolve(this.changes > 0);
                }
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

module.exports = { DatabaseManager }; 