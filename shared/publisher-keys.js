/**
 * Publisher Keys for ECDSA signing
 * Generated using ethers.js with cryptographically secure random entropy
 * 
 * WARNING: These are production-grade private keys. In a real application,
 * private keys should be stored securely (environment variables, key management systems)
 * and never committed to version control.
 */

const { ethers } = require('ethers');

/**
 * Real ECDSA keypairs for publisher authentication
 * Using secp256k1 curve (Ethereum standard)
 * Generated: 2025-07-04T22:01:44.693Z
 */
const PUBLISHER_KEYS = {
    'themodernbyte.com': {
        privateKey: '0x79b9be0588ba3f0fe9402b42b94c15884d07861dbbde985e7c51e6654b9e8177',
        publicKey: '0x04dc4d36c81578ad126887f0a5942e2fd1cbc56dad152a43a2f03e032938f45c13cf87e1027d66ec2bf60fc423f34afe80384e9ad67b20cdec28143bc2469d7183',
        address: '0x8d5625f97295ce30cD728c5bb1Aa2af1751D8Dd3'
    },
    'smartlivingguide.com': {
        privateKey: '0x8bd85201f627289b8429afb71c7aa5702e8f474e0ce41223271e3e340ef77b92',
        publicKey: '0x04223a91ff1735c390990571925374b3a48e9a2739d6de48ae5278a4c5279754666e0053932aa7f480abc5688c5d299a2dc7aa68682eb4e30e9d440af5d72c7147',
        address: '0x5467A29a4536C34e7734a2EA9467eA26e330069b'
    }
};

/**
 * Validate keypair format and derivation
 * @param {string} domain - Publisher domain
 * @returns {boolean} - Validation result
 */
function validatePublisherKeys(domain) {
    const keys = PUBLISHER_KEYS[domain];
    if (!keys) {
        throw new Error(`No keys found for domain: ${domain}`);
    }
    
    // Verify private key format
    if (keys.privateKey.length !== 66 || !keys.privateKey.startsWith('0x')) {
        throw new Error(`Invalid private key format for ${domain}`);
    }
    
    // Verify public key derivation
    try {
        const wallet = new ethers.Wallet(keys.privateKey);
        return wallet.publicKey === keys.publicKey && wallet.address === keys.address;
    } catch (error) {
        throw new Error(`Keypair validation failed for ${domain}: ${error.message}`);
    }
}

/**
 * Get wallet instance for a publisher domain
 * @param {string} domain - Publisher domain
 * @returns {ethers.Wallet} - Wallet instance
 */
function getPublisherWallet(domain) {
    const keys = PUBLISHER_KEYS[domain];
    if (!keys) {
        throw new Error(`No keys found for domain: ${domain}`);
    }
    return new ethers.Wallet(keys.privateKey);
}

// Export the keys and helper functions
module.exports = { 
    PUBLISHER_KEYS,
    validatePublisherKeys,
    getPublisherWallet
}; 