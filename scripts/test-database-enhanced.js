const { DatabaseManager, DatabaseError, ValidationError } = require('../shared/database');
const { PublisherSigner } = require('../shared/cryptography');
const { PUBLISHER_KEYS } = require('../shared/publisher-keys');
const { ethers } = require('ethers');

/**
 * Enhanced Database Test Suite
 * Tests all database functionality including cryptographic integration
 */

async function runEnhancedDatabaseTests() {
    console.log('🗃️  Running Enhanced Database Test Suite...\n');
    
    let testsRun = 0;
    let testsPassed = 0;
    const dbManager = new DatabaseManager();
    
    const runTest = async (testName, testFunction) => {
        testsRun++;
        try {
            await testFunction();
            console.log(`✅ ${testName}`);
            testsPassed++;
        } catch (error) {
            console.log(`❌ ${testName}: ${error.message}`);
        }
    };

    try {
        // Test 1: Database initialization
        await runTest('Database initialization works', async () => {
            await dbManager.initializeDatabase();
            if (!dbManager.db) throw new Error('Database not initialized');
        });

        // Test 2: Table verification
        await runTest('Table verification works', async () => {
            await dbManager.verifyTablesExist();
        });

        // Test 3: Enhanced error classes
        await runTest('Error classes work correctly', async () => {
            const dbError = new DatabaseError('Test DB error');
            const validationError = new ValidationError('Test validation error');
            
            if (dbError.name !== 'DatabaseError') throw new Error('DatabaseError name incorrect');
            if (validationError.name !== 'ValidationError') throw new Error('ValidationError name incorrect');
            if (!(validationError instanceof DatabaseError)) throw new Error('ValidationError inheritance incorrect');
        });

        // Test 4: Attestation validation
        await runTest('Attestation validation works', async () => {
            const invalidAttestation = {
                tag: 'invalid-tag',
                signature: 'test-sig',
                publisher: 'test-publisher'
            };
            
            try {
                await dbManager.storeAttestation(invalidAttestation);
                throw new Error('Should have thrown validation error');
            } catch (error) {
                if (!(error instanceof ValidationError)) throw new Error('Wrong error type');
            }
        });

        // Test 5: Create test attestation with cryptography
        let testAttestation;
        let testWallet;
        await runTest('Create valid attestation with cryptography', async () => {
            testWallet = ethers.Wallet.createRandom();
            const publisher = 'themodernbyte.com';
            const privateKey = PUBLISHER_KEYS[publisher].privateKey;
            const signer = new PublisherSigner(privateKey, publisher);
            
            testAttestation = await signer.signAttestation('finance', testWallet.address);
            
            if (!testAttestation.signature) throw new Error('Attestation not signed');
            if (!testAttestation.nonce) throw new Error('Attestation missing nonce');
            if (!testAttestation.timestamp) throw new Error('Attestation missing timestamp');
        });

        // Test 6: Verify and store attestation
        await runTest('Verify and store attestation works', async () => {
            const attestationId = await dbManager.verifyAndStoreAttestation(testAttestation);
            if (!attestationId || attestationId <= 0) throw new Error('Attestation not stored');
        });

        // Test 7: Retrieve attestations
        await runTest('Retrieve attestations works', async () => {
            const attestations = await dbManager.getAllAttestations(testWallet.address);
            if (attestations.length !== 1) throw new Error('Attestation not retrieved');
            if (attestations[0].tag !== 'finance') throw new Error('Incorrect tag retrieved');
        });

        // Test 8: Get complete user profile
        await runTest('Get complete user profile works', async () => {
            const completeProfile = await dbManager.getCompleteUserProfile(testWallet.address);
            if (!completeProfile.stats) throw new Error('Profile stats missing');
            if (completeProfile.stats.totalAttestations !== 1) throw new Error('Incorrect attestation count');
            if (completeProfile.stats.tags.finance !== 1) throw new Error('Incorrect tag count');
        });

        // Test 9: Batch store attestations
        await runTest('Batch store attestations works', async () => {
            const publisher = 'smartlivingguide.com';
            const privateKey = PUBLISHER_KEYS[publisher].privateKey;
            const signer = new PublisherSigner(privateKey, publisher);
            
            const attestations = [
                await signer.signAttestation('privacy', testWallet.address),
                await signer.signAttestation('travel', testWallet.address)
            ];
            
            const ids = await dbManager.batchStoreAttestations(attestations);
            if (ids.length !== 2) throw new Error('Batch store failed');
        });

        // Test 10: Updated profile stats
        await runTest('Updated profile stats work', async () => {
            const completeProfile = await dbManager.getCompleteUserProfile(testWallet.address);
            if (completeProfile.stats.totalAttestations !== 3) throw new Error('Incorrect total attestations');
            if (completeProfile.stats.publishers.length !== 2) throw new Error('Incorrect publisher count');
            if (!completeProfile.stats.tags.privacy) throw new Error('Privacy tag missing');
            if (!completeProfile.stats.tags.travel) throw new Error('Travel tag missing');
        });

        // Test 11: Transaction support
        await runTest('Transaction support works', async () => {
            const result = await dbManager.withTransaction(async () => {
                return 'transaction-test';
            });
            if (result !== 'transaction-test') throw new Error('Transaction failed');
        });

        // Test 12: Invalid signature rejection
        await runTest('Invalid signature rejection works', async () => {
            const invalidAttestation = { ...testAttestation, signature: 'invalid-signature' };
            
            try {
                await dbManager.verifyAndStoreAttestation(invalidAttestation);
                throw new Error('Should have rejected invalid signature');
            } catch (error) {
                if (!(error instanceof ValidationError) && !(error instanceof DatabaseError)) {
                    throw new Error(`Wrong error type: ${error.constructor.name}`);
                }
            }
        });

        // Test 13: Profile reset functionality
        await runTest('Profile reset functionality works', async () => {
            const resetResult = await dbManager.resetUserProfile(testWallet.address);
            if (!resetResult.success) throw new Error('Reset failed');
            if (resetResult.attestationsDeleted !== 3) throw new Error('Incorrect attestations deleted');
            
            // Verify profile is empty
            const profile = await dbManager.getCompleteUserProfile(testWallet.address);
            if (profile.stats.totalAttestations !== 0) throw new Error('Profile not reset');
        });

        // Test 14: Wallet address validation
        await runTest('Wallet address validation works', async () => {
            const invalidAddresses = ['invalid', '0x123', 'not-hex', ''];
            
            for (const addr of invalidAddresses) {
                try {
                    await dbManager.getAllAttestations(addr);
                    throw new Error(`Should have rejected invalid address: ${addr}`);
                } catch (error) {
                    if (!(error instanceof ValidationError)) throw new Error('Wrong error type');
                }
            }
        });

        // Test 15: Connection error handling
        await runTest('Connection error handling works', async () => {
            const badDbManager = new DatabaseManager();
            badDbManager.dbPath = '/invalid/path/database.db';
            
            try {
                await badDbManager.connect();
                throw new Error('Should have thrown connection error');
            } catch (error) {
                if (!(error instanceof DatabaseError)) throw new Error('Wrong error type');
            }
        });

        console.log(`\n📊 Test Results: ${testsPassed}/${testsRun} tests passed`);
        
        if (testsPassed === testsRun) {
            console.log('🎉 All enhanced database tests passed!');
        } else {
            console.log('❌ Some tests failed. Please review the implementation.');
        }

    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
    } finally {
        // Cleanup
        if (dbManager.db) {
            await dbManager.close();
        }
    }
}

// Run the tests
runEnhancedDatabaseTests().catch(console.error); 