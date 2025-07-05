/**
 * Browser-compatible publisher keys module
 * Exposes PUBLISHER_KEYS to window object for use in browser environment
 */

// Publisher keys for cryptographic operations (must match server-side keys)
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

// Helper functions for browser environment
function validatePublisherKeys(domain) {
    if (!PUBLISHER_KEYS[domain]) {
        throw new Error(`Publisher keys not found for domain: ${domain}`);
    }
    
    const keys = PUBLISHER_KEYS[domain];
    if (!keys.privateKey || !keys.publicKey) {
        throw new Error(`Invalid key structure for domain: ${domain}`);
    }
    
    return true;
}

function getPublisherWallet(domain) {
    if (typeof window !== 'undefined' && window.ethers) {
        validatePublisherKeys(domain);
        return new window.ethers.Wallet(PUBLISHER_KEYS[domain].privateKey);
    }
    throw new Error('ethers.js not available in browser environment');
}

// Expose to window object if in browser environment
if (typeof window !== 'undefined') {
    window.PUBLISHER_KEYS = PUBLISHER_KEYS;
    window.validatePublisherKeys = validatePublisherKeys;
    window.getPublisherWallet = getPublisherWallet;
    
    console.log('✅ PUBLISHER_KEYS available on window object');
} 