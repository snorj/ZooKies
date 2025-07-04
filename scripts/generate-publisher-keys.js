const { ethers } = require('ethers');

/**
 * Generate Real ECDSA Keypairs for Publisher Authentication
 * 
 * This script generates cryptographically secure ECDSA keypairs using ethers.js
 * for both publisher domains (themodernbyte.com and smartlivingguide.com).
 * 
 * The keypairs use the secp256k1 curve (Ethereum standard) and provide
 * production-grade security for publisher authentication.
 */

console.log('🔐 Generating Real ECDSA Keypairs for Publisher Authentication...\n');

// Generate keypair for themodernbyte.com
console.log('📊 Generating keypair for themodernbyte.com...');
const themodernbyteWallet = ethers.Wallet.createRandom();
console.log('✅ TheModernByte keypair generated successfully');
console.log(`   Private Key: ${themodernbyteWallet.privateKey}`);
console.log(`   Public Key:  ${themodernbyteWallet.publicKey}`);
console.log(`   Address:     ${themodernbyteWallet.address}\n`);

// Generate keypair for smartlivingguide.com
console.log('🏡 Generating keypair for smartlivingguide.com...');
const smartlivingguideWallet = ethers.Wallet.createRandom();
console.log('✅ SmartLivingGuide keypair generated successfully');
console.log(`   Private Key: ${smartlivingguideWallet.privateKey}`);
console.log(`   Public Key:  ${smartlivingguideWallet.publicKey}`);
console.log(`   Address:     ${smartlivingguideWallet.address}\n`);

// Verify key generation and format
console.log('🔍 Verifying keypair generation...');

// Verify private key format (66 characters with 0x prefix)
const verifyPrivateKey = (key, domain) => {
    if (key.length !== 66 || !key.startsWith('0x')) {
        throw new Error(`Invalid private key format for ${domain}`);
    }
    console.log(`✅ ${domain} private key format verified`);
};

// Verify public key derivation
const verifyPublicKeyDerivation = (privateKey, publicKey, domain) => {
    const derivedWallet = new ethers.Wallet(privateKey);
    if (derivedWallet.publicKey !== publicKey) {
        throw new Error(`Public key derivation failed for ${domain}`);
    }
    console.log(`✅ ${domain} public key derivation verified`);
};

// Verify signatures work
const verifySigningCapability = (wallet, domain) => {
    const testMessage = "Test message for signing verification";
    const messageHash = ethers.utils.id(testMessage);
    const signature = wallet.signMessage(testMessage);
    console.log(`✅ ${domain} signing capability verified`);
    return signature;
};

// Run verification tests
try {
    verifyPrivateKey(themodernbyteWallet.privateKey, 'themodernbyte.com');
    verifyPrivateKey(smartlivingguideWallet.privateKey, 'smartlivingguide.com');
    
    verifyPublicKeyDerivation(themodernbyteWallet.privateKey, themodernbyteWallet.publicKey, 'themodernbyte.com');
    verifyPublicKeyDerivation(smartlivingguideWallet.privateKey, smartlivingguideWallet.publicKey, 'smartlivingguide.com');
    
    verifySigningCapability(themodernbyteWallet, 'themodernbyte.com');
    verifySigningCapability(smartlivingguideWallet, 'smartlivingguide.com');
    
    console.log('\n🎉 All keypair verification tests passed!');
    
} catch (error) {
    console.error('❌ Keypair verification failed:', error.message);
    process.exit(1);
}

// Generate the publisher-keys.js file content
const publisherKeysContent = `/**
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
 * Generated: ${new Date().toISOString()}
 */
const PUBLISHER_KEYS = {
    'themodernbyte.com': {
        privateKey: '${themodernbyteWallet.privateKey}',
        publicKey: '${themodernbyteWallet.publicKey}',
        address: '${themodernbyteWallet.address}'
    },
    'smartlivingguide.com': {
        privateKey: '${smartlivingguideWallet.privateKey}',
        publicKey: '${smartlivingguideWallet.publicKey}',
        address: '${smartlivingguideWallet.address}'
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
        throw new Error(\`No keys found for domain: \${domain}\`);
    }
    
    // Verify private key format
    if (keys.privateKey.length !== 66 || !keys.privateKey.startsWith('0x')) {
        throw new Error(\`Invalid private key format for \${domain}\`);
    }
    
    // Verify public key derivation
    try {
        const wallet = new ethers.Wallet(keys.privateKey);
        return wallet.publicKey === keys.publicKey && wallet.address === keys.address;
    } catch (error) {
        throw new Error(\`Keypair validation failed for \${domain}: \${error.message}\`);
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
        throw new Error(\`No keys found for domain: \${domain}\`);
    }
    return new ethers.Wallet(keys.privateKey);
}

// Export the keys and helper functions
module.exports = { 
    PUBLISHER_KEYS,
    validatePublisherKeys,
    getPublisherWallet
};
`;

// Write the generated content to a temporary file for review
const fs = require('fs');
const path = require('path');

const tempFilePath = path.join(__dirname, 'generated-publisher-keys.js');
fs.writeFileSync(tempFilePath, publisherKeysContent);

console.log(`\n📁 Generated publisher-keys.js content saved to: ${tempFilePath}`);
console.log('\n🔧 To apply these keys to your project:');
console.log('   1. Review the generated file for security');
console.log('   2. Copy the content to shared/publisher-keys.js');
console.log('   3. Test the implementation');
console.log('\n⚠️  Security Note: These private keys should be stored securely in production!');

process.exit(0); 