const { 
    PublisherSigner, 
    CryptographyError, 
    SignatureVerificationError, 
    AttestationValidationError 
} = require('../shared/cryptography');
const { PUBLISHER_KEYS } = require('../shared/publisher-keys');
const { ethers } = require('ethers');

/**
 * Comprehensive Cryptography Test Suite
 * Validates all requirements from Task 5 test strategy
 */

console.log('Running Cryptography Test Suite...');

async function runTests() {
    let testsRun = 0;
    let testsPassed = 0;
    
    const test = async (name, fn) => {
        testsRun++;
        try {
            await fn();
            console.log(`✅ ${name}`);
            testsPassed++;
        } catch (error) {
            console.log(`❌ ${name}: ${error.message}`);
        }
    };
    
    // Test 1: Module structure
    await test('Module exports work correctly', () => {
        if (!PublisherSigner) throw new Error('PublisherSigner not exported');
        if (!CryptographyError) throw new Error('CryptographyError not exported');
    });
    
    // Test 2: Constructor validation
    await test('Constructor validates private key', () => {
        try {
            new PublisherSigner('invalid', 'test.com');
            throw new Error('Should reject invalid key');
        } catch (error) {
            if (!(error instanceof CryptographyError)) throw new Error('Wrong error type');
        }
    });
    
    await test('Constructor works with valid inputs', () => {
        const key = PUBLISHER_KEYS['themodernbyte.com'].privateKey;
        const signer = new PublisherSigner(key, 'themodernbyte.com');
        if (!signer.wallet || !signer.address) throw new Error('Wallet not initialized');
    });
    
    // Test 3: UUID generation
    await test('generateNonce produces valid UUIDs', () => {
        const nonce = PublisherSigner.generateNonce();
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(nonce)) throw new Error('Invalid UUID format');
    });
    
    await test('generateNonce produces unique values', () => {
        const nonces = new Set();
        for (let i = 0; i < 10; i++) {
            const nonce = PublisherSigner.generateNonce();
            if (nonces.has(nonce)) throw new Error('Duplicate nonce');
            nonces.add(nonce);
        }
    });
    
    // Test 4: Signature generation
    const key = PUBLISHER_KEYS['themodernbyte.com'].privateKey;
    const signer = new PublisherSigner(key, 'themodernbyte.com');
    const testWallet = '0x1234567890123456789012345678901234567890';
    
    await test('signAttestation creates valid attestation', async () => {
        const attestation = await signer.signAttestation('finance', testWallet);
        const required = ['tag', 'timestamp', 'nonce', 'signature', 'publisher', 'user_wallet'];
        required.forEach(field => {
            if (!attestation[field]) throw new Error(`Missing field: ${field}`);
        });
    });
    
    await test('signAttestation validates tag values', async () => {
        try {
            await signer.signAttestation('invalid-tag', testWallet);
            throw new Error('Should reject invalid tag');
        } catch (error) {
            if (!(error instanceof CryptographyError)) throw new Error('Wrong error type');
        }
    });
    
    await test('signAttestation validates wallet format', async () => {
        try {
            await signer.signAttestation('finance', 'invalid-wallet');
            throw new Error('Should reject invalid wallet');
        } catch (error) {
            if (!(error instanceof CryptographyError)) throw new Error('Wrong error type');
        }
    });
    
    await test('signAttestation produces unique signatures', async () => {
        const att1 = await signer.signAttestation('finance', testWallet);
        const att2 = await signer.signAttestation('finance', testWallet);
        if (att1.signature === att2.signature) throw new Error('Signatures should be unique');
    });
    
    // Test 5: Signature verification
    await test('verifyAttestation works with valid signatures', async () => {
        const attestation = await signer.signAttestation('privacy', testWallet);
        const isValid = PublisherSigner.verifyAttestation(attestation, signer.address);
        if (!isValid) throw new Error('Valid attestation should verify');
    });
    
         await test('verifyAttestation rejects tampered attestations', async () => {
         const attestation = await signer.signAttestation('privacy', testWallet);
         const tampered = { ...attestation, tag: 'finance' };
         // Remove the stored message to force reconstruction from tampered data
         delete tampered.message;
         try {
             PublisherSigner.verifyAttestation(tampered, signer.address);
             throw new Error('Should reject tampered attestation');
         } catch (error) {
             if (!(error instanceof SignatureVerificationError)) throw new Error(`Wrong error type: ${error.constructor.name}`);
         }
     });
    
    await test('verifyAttestation rejects wrong public key', async () => {
        const attestation = await signer.signAttestation('travel', testWallet);
        const wrongAddress = '0x0000000000000000000000000000000000000001';
        try {
            PublisherSigner.verifyAttestation(attestation, wrongAddress);
            throw new Error('Should reject wrong public key');
        } catch (error) {
            if (!(error instanceof SignatureVerificationError)) throw new Error('Wrong error type');
        }
    });
    
    // Test 6: Cross-compatibility
    await test('Cross-publisher verification', async () => {
        const slgKey = PUBLISHER_KEYS['smartlivingguide.com'].privateKey;
        const slgSigner = new PublisherSigner(slgKey, 'smartlivingguide.com');
        
        const tmbAttestation = await signer.signAttestation('gaming', testWallet);
        const slgAttestation = await slgSigner.signAttestation('gaming', testWallet);
        
        const tmbValid = PublisherSigner.verifyAttestation(tmbAttestation, signer.address);
        const slgValid = PublisherSigner.verifyAttestation(slgAttestation, slgSigner.address);
        
        if (!tmbValid || !slgValid) throw new Error('Both attestations should verify');
        
        // Cross-verification should fail
        try {
            PublisherSigner.verifyAttestation(tmbAttestation, slgSigner.address);
            throw new Error('Cross-verification should fail');
        } catch (error) {
            if (!(error instanceof SignatureVerificationError)) throw new Error('Wrong error type');
        }
    });
    
    // Test 7: Security validation
    await test('Signatures use secp256k1 curve', async () => {
        const attestation = await signer.signAttestation('privacy', testWallet);
        const recoveredAddress = ethers.utils.verifyMessage(attestation.message, attestation.signature);
        if (recoveredAddress !== signer.address) throw new Error('Signature verification failed');
    });
    
    await test('Message formatting is deterministic', () => {
        const msg1 = signer.formatMessage('finance', testWallet, 1234567890, 'test-nonce');
        const msg2 = signer.formatMessage('finance', testWallet, 1234567890, 'test-nonce');
        if (msg1 !== msg2) throw new Error('Message formatting should be deterministic');
    });
    
    await test('Complete attestation workflow', async () => {
        const attestation = await signer.signAttestation('travel', testWallet);
        
        // Verify with address
        const validWithAddress = PublisherSigner.verifyAttestation(attestation, signer.address);
        
        // Verify with public key
        const validWithPubKey = PublisherSigner.verifyAttestation(attestation, signer.publicKey);
        
        if (!validWithAddress || !validWithPubKey) {
            throw new Error('Should verify with both address and public key');
        }
    });
    
    await test('getSignerInfo returns correct information', () => {
        const info = signer.getSignerInfo();
        if (!info.publicKey || !info.address || !info.publisherDomain) {
            throw new Error('Missing info fields');
        }
        if (info.address !== signer.address) throw new Error('Address mismatch');
    });
    
    // Results
    console.log(`\nTests Run: ${testsRun}`);
    console.log(`Tests Passed: ${testsPassed}`);
    console.log(`Success Rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%`);
    
    if (testsPassed === testsRun) {
        console.log('\n🎉 All tests passed! Cryptography implementation is complete.');
        return true;
    } else {
        console.log('\n❌ Some tests failed.');
        return false;
    }
}

runTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    }); 