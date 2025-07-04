/**
 * Cryptography module for ECDSA signing and verification
 * Implements PublisherSigner class with secp256k1 curve operations using ethers.js
 * 
 * Features:
 * - ECDSA signature creation and verification
 * - UUID nonce generation with fallback strategy
 * - Structured attestation object creation
 * - Message formatting for consistent signing
 * - Comprehensive error handling and validation
 */

const { ethers } = require('ethers');

// UUID generation with fallback strategy
let generateUUID;
try {
    // Primary: Use Node.js built-in crypto.randomUUID() (Node.js 14.17.0+)
    const crypto = require('crypto');
    if (crypto.randomUUID) {
        generateUUID = () => crypto.randomUUID();
    } else {
        throw new Error('crypto.randomUUID not available');
    }
} catch (error) {
    try {
        // Fallback: Use uuid package if available
        const { v4: uuidv4 } = require('uuid');
        generateUUID = uuidv4;
        console.log('Using uuid package for UUID generation (crypto.randomUUID not available)');
    } catch (uuidError) {
        // Final fallback: Generate UUID-like string manually
        generateUUID = () => {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };
        console.warn('Using manual UUID fallback (neither crypto.randomUUID nor uuid package available)');
    }
}

/**
 * Custom error classes for cryptographic operations
 */
class CryptographyError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CryptographyError';
    }
}

class SignatureVerificationError extends CryptographyError {
    constructor(message) {
        super(message);
        this.name = 'SignatureVerificationError';
    }
}

class AttestationValidationError extends CryptographyError {
    constructor(message) {
        super(message);
        this.name = 'AttestationValidationError';
    }
}

/**
 * Publisher Signer class for ECDSA secp256k1 cryptographic operations
 * Handles attestation creation, signing, and verification for ZooKies platform
 */
class PublisherSigner {
    /**
     * Create a new PublisherSigner instance
     * @param {string} privateKey - 66-character hex string starting with 0x
     * @param {string} publisherDomain - Publisher domain (e.g., 'themodernbyte.com')
     */
    constructor(privateKey, publisherDomain) {
        // Validate input parameters
        if (!privateKey || typeof privateKey !== 'string') {
            throw new CryptographyError('Private key is required and must be a string');
        }
        
        if (!publisherDomain || typeof publisherDomain !== 'string') {
            throw new CryptographyError('Publisher domain is required and must be a string');
        }

        // Validate private key format
        if (privateKey.length !== 66 || !privateKey.startsWith('0x')) {
            throw new CryptographyError('Private key must be 66-character hex string starting with 0x');
        }

        try {
            // Initialize wallet with private key (validates secp256k1 compatibility)
            this.wallet = new ethers.Wallet(privateKey);
            this.privateKey = privateKey;
            this.publisherDomain = publisherDomain;
            this.publicKey = this.wallet.publicKey;
            this.address = this.wallet.address;
        } catch (error) {
            throw new CryptographyError(`Failed to initialize wallet: ${error.message}`);
        }
    }

    /**
     * Generate a cryptographically secure UUID nonce
     * @returns {string} - UUID string
     */
    static generateNonce() {
        try {
            return generateUUID();
        } catch (error) {
            throw new CryptographyError(`UUID generation failed: ${error.message}`);
        }
    }

    /**
     * Create a structured message for consistent signing
     * @param {string} tag - Attestation tag (e.g., 'finance', 'privacy', 'travel', 'gaming')
     * @param {string} userWallet - User's wallet address
     * @param {number} timestamp - Unix timestamp
     * @param {string} nonce - UUID nonce for uniqueness
     * @returns {string} - Formatted message for signing
     */
    formatMessage(tag, userWallet, timestamp, nonce) {
        // Create deterministic message structure for consistent signatures
        const messageData = {
            tag: tag,
            timestamp: timestamp,
            nonce: nonce,
            userWallet: userWallet,
            publisherDomain: this.publisherDomain
        };

        // Use JSON.stringify with sorted keys for deterministic serialization
        const sortedData = {};
        Object.keys(messageData).sort().forEach(key => {
            sortedData[key] = messageData[key];
        });

        return JSON.stringify(sortedData);
    }

    /**
     * Sign an attestation for a user's ad interaction
     * @param {string} tag - Attestation tag ('finance', 'privacy', 'travel', 'gaming')
     * @param {string} userWallet - User's wallet address
     * @returns {Promise<Object>} - Structured attestation object with signature
     */
    async signAttestation(tag, userWallet) {
        // Validate input parameters
        if (!tag || typeof tag !== 'string') {
            throw new CryptographyError('Tag is required and must be a string');
        }

        if (!userWallet || typeof userWallet !== 'string') {
            throw new CryptographyError('User wallet address is required and must be a string');
        }

        // Validate tag is one of allowed values
        const allowedTags = ['finance', 'privacy', 'travel', 'gaming'];
        if (!allowedTags.includes(tag)) {
            throw new CryptographyError(`Invalid tag: ${tag}. Must be one of: ${allowedTags.join(', ')}`);
        }

        // Validate wallet address format (basic check)
        if (!userWallet.startsWith('0x') || userWallet.length !== 42) {
            throw new CryptographyError('Invalid wallet address format');
        }

        try {
            // Generate timestamp and nonce
            const timestamp = Math.floor(Date.now() / 1000);
            const nonce = PublisherSigner.generateNonce();

            // Format message for signing
            const message = this.formatMessage(tag, userWallet, timestamp, nonce);

            // Generate ECDSA signature
            const signature = await this.wallet.signMessage(message);

            // Return structured attestation object
            return {
                tag: tag,
                timestamp: timestamp,
                nonce: nonce,
                signature: signature,
                publisher: this.publisherDomain,
                user_wallet: userWallet,
                message: message,  // Include original message for verification
                signer_address: this.address
            };

        } catch (error) {
            throw new CryptographyError(`Attestation signing failed: ${error.message}`);
        }
    }

    /**
     * Verify an attestation signature against expected public key
     * @param {Object} attestation - Attestation object to verify
     * @param {string} expectedPublicKey - Expected signer's public key or address
     * @returns {boolean} - True if signature is valid, false otherwise
     */
    static verifyAttestation(attestation, expectedPublicKey) {
        try {
            // Validate attestation structure
            if (!attestation || typeof attestation !== 'object') {
                throw new AttestationValidationError('Attestation must be an object');
            }

            const requiredFields = ['tag', 'timestamp', 'nonce', 'signature', 'publisher', 'user_wallet'];
            for (const field of requiredFields) {
                if (!attestation[field]) {
                    throw new AttestationValidationError(`Missing required field: ${field}`);
                }
            }

            // Validate expected public key format
            if (!expectedPublicKey || typeof expectedPublicKey !== 'string') {
                throw new AttestationValidationError('Expected public key is required and must be a string');
            }

            // Reconstruct original message from attestation data
            let message;
            if (attestation.message) {
                // Use stored message if available
                message = attestation.message;
            } else {
                // Reconstruct message from attestation data using same format as formatMessage
                const messageData = {
                    tag: attestation.tag,
                    timestamp: attestation.timestamp,
                    nonce: attestation.nonce,
                    userWallet: attestation.user_wallet,
                    publisherDomain: attestation.publisher
                };
                
                // Use same sorted key approach as formatMessage
                const sortedData = {};
                Object.keys(messageData).sort().forEach(key => {
                    sortedData[key] = messageData[key];
                });
                
                message = JSON.stringify(sortedData);
            }

            // Verify ECDSA signature
            const recoveredAddress = ethers.utils.verifyMessage(message, attestation.signature);

            // Check if recovered address matches expected public key
            // Support both address format (0x...) and public key format
            let expectedAddress;
            if (expectedPublicKey.startsWith('0x') && expectedPublicKey.length === 42) {
                // It's an address
                expectedAddress = expectedPublicKey;
            } else if (expectedPublicKey.startsWith('0x') && (expectedPublicKey.length === 130 || expectedPublicKey.length === 132)) {
                // It's a public key (compressed 130 chars or uncompressed 132 chars), derive address
                expectedAddress = ethers.utils.computeAddress(expectedPublicKey);
            } else {
                throw new AttestationValidationError(`Invalid expected public key format. Length: ${expectedPublicKey.length}, Expected: 42 (address) or 130/132 (public key)`);
            }

            const isValid = recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();

            if (!isValid) {
                throw new SignatureVerificationError(
                    `Signature verification failed. Expected: ${expectedAddress}, Got: ${recoveredAddress}`
                );
            }

            return true;

        } catch (error) {
            if (error instanceof CryptographyError) {
                throw error;
            }
            throw new SignatureVerificationError(`Signature verification failed: ${error.message}`);
        }
    }

    /**
     * Get signer information
     * @returns {Object} - Signer details
     */
    getSignerInfo() {
        return {
            publicKey: this.publicKey,
            address: this.address,
            publisherDomain: this.publisherDomain
        };
    }
}

// Export classes and functions
module.exports = { 
    PublisherSigner,
    CryptographyError,
    SignatureVerificationError,
    AttestationValidationError
}; 