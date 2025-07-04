const { PUBLISHER_KEYS, validatePublisherKeys, getPublisherWallet } = require('../shared/publisher-keys');
const { ethers } = require('ethers');

/**
 * Comprehensive Publisher Keys Test Suite
 * Validates all requirements from Task 4 test strategy
 */

async function runPublisherKeysTests() {
    console.log('🧪 Running Comprehensive Publisher Keys Test Suite...\n');
    
    let testsRun = 0;
    let testsPassed = 0;
    
    const runTest = (testName, testFunction) => {
        testsRun++;
        try {
            testFunction();
            console.log(`✅ ${testName}`);
            testsPassed++;
        } catch (error) {
            console.log(`❌ ${testName}: ${error.message}`);
        }
    };
    
    const runAsyncTest = async (testName, testFunction) => {
        testsRun++;
        try {
            await testFunction();
            console.log(`✅ ${testName}`);
            testsPassed++;
        } catch (error) {
            console.log(`❌ ${testName}: ${error.message}`);
        }
    };

    // Test 1: File Structure Verification
    console.log('📁 File Structure and Module Loading Tests:');
    
    runTest('Module can be required without errors', () => {
        if (!PUBLISHER_KEYS || typeof PUBLISHER_KEYS !== 'object') {
            throw new Error('PUBLISHER_KEYS not properly exported');
        }
    });
    
    runTest('PUBLISHER_KEYS object has correct structure', () => {
        const expectedDomains = ['themodernbyte.com', 'smartlivingguide.com'];
        expectedDomains.forEach(domain => {
            if (!PUBLISHER_KEYS[domain]) {
                throw new Error(`Missing keys for domain: ${domain}`);
            }
            if (!PUBLISHER_KEYS[domain].privateKey || !PUBLISHER_KEYS[domain].publicKey) {
                throw new Error(`Missing privateKey or publicKey for: ${domain}`);
            }
        });
    });
    
    runTest('Helper functions are exported', () => {
        if (typeof validatePublisherKeys !== 'function') {
            throw new Error('validatePublisherKeys function not exported');
        }
        if (typeof getPublisherWallet !== 'function') {
            throw new Error('getPublisherWallet function not exported');
        }
    });

    // Test 2: Keypair Validation
    console.log('\n🔑 Keypair Format and Validation Tests:');
    
    Object.keys(PUBLISHER_KEYS).forEach(domain => {
        const keys = PUBLISHER_KEYS[domain];
        
        runTest(`${domain} private key format validation`, () => {
            if (keys.privateKey.length !== 66) {
                throw new Error(`Private key length is ${keys.privateKey.length}, expected 66`);
            }
            if (!keys.privateKey.startsWith('0x')) {
                throw new Error('Private key must start with 0x');
            }
        });
        
        runTest(`${domain} public key derivation verification`, () => {
            const wallet = new ethers.Wallet(keys.privateKey);
            if (wallet.publicKey !== keys.publicKey) {
                throw new Error('Public key does not match derived public key');
            }
            if (wallet.address !== keys.address) {
                throw new Error('Address does not match derived address');
            }
        });
        
        runTest(`${domain} wallet instantiation test`, () => {
            const wallet = new ethers.Wallet(keys.privateKey);
            if (!wallet.privateKey || !wallet.publicKey || !wallet.address) {
                throw new Error('Wallet instantiation failed');
            }
        });
    });

    // Test 3: Cryptographic Integrity
    console.log('\n🔐 Cryptographic Integrity Tests:');
    
    runTest('Keys are different between publishers', () => {
        const tmb = PUBLISHER_KEYS['themodernbyte.com'];
        const slg = PUBLISHER_KEYS['smartlivingguide.com'];
        
        if (tmb.privateKey === slg.privateKey) {
            throw new Error('Private keys should be different between publishers');
        }
        if (tmb.publicKey === slg.publicKey) {
            throw new Error('Public keys should be different between publishers');
        }
        if (tmb.address === slg.address) {
            throw new Error('Addresses should be different between publishers');
        }
    });
    
    await runAsyncTest('Signing and verification workflow test', async () => {
        const testMessage = "Test attestation message for cryptographic verification";
        const domain = 'themodernbyte.com';
        const wallet = getPublisherWallet(domain);
        
        // Sign the message
        const signature = await wallet.signMessage(testMessage);
        
        // Verify the signature
        const recoveredAddress = ethers.utils.verifyMessage(testMessage, signature);
        if (recoveredAddress !== wallet.address) {
            throw new Error('Signature verification failed');
        }
    });
    
    runTest('Keys are not placeholder values', () => {
        Object.keys(PUBLISHER_KEYS).forEach(domain => {
            const keys = PUBLISHER_KEYS[domain];
            if (keys.privateKey.includes('0000000000000000000000000000000000000000000000000000000000000000')) {
                throw new Error(`${domain} still has placeholder private key`);
            }
        });
    });

    // Test 4: Helper Functions Validation
    console.log('\n🛠️ Helper Functions Tests:');
    
    runTest('validatePublisherKeys function works correctly', () => {
        const result1 = validatePublisherKeys('themodernbyte.com');
        const result2 = validatePublisherKeys('smartlivingguide.com');
        
        if (!result1 || !result2) {
            throw new Error('validatePublisherKeys should return true for valid keys');
        }
    });
    
    runTest('validatePublisherKeys throws error for invalid domain', () => {
        try {
            validatePublisherKeys('invalid-domain.com');
            throw new Error('Should have thrown error for invalid domain');
        } catch (error) {
            if (!error.message.includes('No keys found')) {
                throw new Error('Wrong error message for invalid domain');
            }
        }
    });
    
    runTest('getPublisherWallet returns valid wallet instances', () => {
        const wallet1 = getPublisherWallet('themodernbyte.com');
        const wallet2 = getPublisherWallet('smartlivingguide.com');
        
        if (!(wallet1 instanceof ethers.Wallet) || !(wallet2 instanceof ethers.Wallet)) {
            throw new Error('getPublisherWallet should return ethers.Wallet instances');
        }
        
        if (!wallet1.privateKey || !wallet2.privateKey) {
            throw new Error('Returned wallets should have private keys');
        }
    });

    // Test 5: Security Validation
    console.log('\n🛡️ Security Validation Tests:');
    
    runTest('Keys use secp256k1 curve (Ethereum compatible)', () => {
        Object.keys(PUBLISHER_KEYS).forEach(domain => {
            const wallet = getPublisherWallet(domain);
            
            // Test that we can create a signature that's valid with ethers.js
            const testMessage = "secp256k1 compatibility test";
            const messageBytes = ethers.utils.toUtf8Bytes(testMessage);
            const messageHash = ethers.utils.keccak256(messageBytes);
            
            // This should work if secp256k1 is used
            const signature = wallet._signingKey().signDigest(messageHash);
            
            if (!signature.r || !signature.s) {
                throw new Error(`${domain} signature components missing`);
            }
        });
    });
    
    runTest('Private keys have sufficient entropy', () => {
        Object.keys(PUBLISHER_KEYS).forEach(domain => {
            const privateKey = PUBLISHER_KEYS[domain].privateKey;
            const hex = privateKey.slice(2); // Remove 0x prefix
            
            // Check for obvious patterns (should not be all same character, ascending, etc.)
            const firstChar = hex[0];
            const allSame = hex.split('').every(char => char === firstChar);
            
            if (allSame) {
                throw new Error(`${domain} private key lacks entropy (all same character)`);
            }
            
            // Check it's not incrementing pattern
            let isIncrementing = true;
            for (let i = 1; i < Math.min(10, hex.length); i++) {
                if (parseInt(hex[i], 16) !== (parseInt(hex[i-1], 16) + 1) % 16) {
                    isIncrementing = false;
                    break;
                }
            }
            
            if (isIncrementing) {
                throw new Error(`${domain} private key appears to use incrementing pattern`);
            }
        });
    });

    // Test 6: Real-world Attestation Test
    console.log('\n🌍 Real-world Integration Tests:');
    
    await runAsyncTest('Complete attestation creation and verification flow', async () => {
        const domain = 'themodernbyte.com';
        const wallet = getPublisherWallet(domain);
        
        // Create a realistic attestation object
        const attestation = {
            tag: 'finance',
            timestamp: Math.floor(Date.now() / 1000),
            nonce: 'test-nonce-12345',
            publisher: domain,
            userWallet: '0x1234567890123456789012345678901234567890'
        };
        
        // Create message to sign (similar to what would be done in cryptography module)
        const message = JSON.stringify(attestation);
        const signature = await wallet.signMessage(message);
        
        // Verify signature
        const recoveredAddress = ethers.utils.verifyMessage(message, signature);
        
        if (recoveredAddress !== wallet.address) {
            throw new Error('End-to-end attestation signature verification failed');
        }
        
        // Verify signature matches our stored public key
        const expectedAddress = PUBLISHER_KEYS[domain].address;
        if (recoveredAddress !== expectedAddress) {
            throw new Error('Recovered address does not match stored address');
        }
    });

    // Final Results
    console.log('\n📊 Test Results Summary:');
    console.log(`Tests Run: ${testsRun}`);
    console.log(`Tests Passed: ${testsPassed}`);
    console.log(`Tests Failed: ${testsRun - testsPassed}`);
    console.log(`Success Rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%`);
    
    if (testsPassed === testsRun) {
        console.log('\n🎉 All tests passed! Publisher keys implementation is complete and secure.');
        
        console.log('\n📝 Key Summary:');
        Object.keys(PUBLISHER_KEYS).forEach(domain => {
            const keys = PUBLISHER_KEYS[domain];
            console.log(`  ${domain}:`);
            console.log(`    Address: ${keys.address}`);
            console.log(`    Private Key: ${keys.privateKey.slice(0, 10)}...${keys.privateKey.slice(-8)}`);
            console.log(`    Public Key: ${keys.publicKey.slice(0, 10)}...${keys.publicKey.slice(-8)}`);
        });
        
        return true;
    } else {
        console.log('\n❌ Some tests failed. Please review the implementation.');
        return false;
    }
}

// Run the tests
runPublisherKeysTests()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('❌ Test suite execution failed:', error);
        process.exit(1);
    }); 