const { ZkAffinityAgent, ZkAffinityAgentError, WalletError, AttestationError } = require('../shared/zkAffinityAgent');

/**
 * Comprehensive zkAffinityAgent Test Suite
 * Tests all functionality including singleton pattern, wallet management, 
 * ad interactions, modal system, and profile management
 */

async function runZkAffinityAgentTests() {
    console.log('🎯 Running Comprehensive zkAffinityAgent Test Suite...\n');
    
    let testsRun = 0;
    let testsPassed = 0;
    
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

    // Test 1: Module Loading and Singleton Pattern
    await runTest('Module exports work correctly', () => {
        if (!ZkAffinityAgent) throw new Error('ZkAffinityAgent class not exported');
        if (!ZkAffinityAgentError) throw new Error('ZkAffinityAgentError class not exported');
        if (!WalletError) throw new Error('WalletError class not exported');
        if (!AttestationError) throw new Error('AttestationError class not exported');
    });

    // Test 2: Singleton Pattern Implementation
    await runTest('Singleton pattern works correctly', () => {
        const agent1 = new ZkAffinityAgent();
        const agent2 = new ZkAffinityAgent();
        
        if (agent1 !== agent2) {
            throw new Error('Singleton pattern failed - different instances returned');
        }
        
        console.log('   ✓ Multiple instantiations return same instance');
    });

    // Test 3: Error Classes Inheritance
    await runTest('Error classes inherit correctly', () => {
        const zkError = new ZkAffinityAgentError('Test error');
        const walletError = new WalletError('Wallet error');
        const attestationError = new AttestationError('Attestation error');
        
        if (!(zkError instanceof Error)) throw new Error('ZkAffinityAgentError not instance of Error');
        if (!(walletError instanceof ZkAffinityAgentError)) throw new Error('WalletError not instance of ZkAffinityAgentError');
        if (!(attestationError instanceof ZkAffinityAgentError)) throw new Error('AttestationError not instance of ZkAffinityAgentError');
        
        console.log('   ✓ All error classes inherit properly');
    });

    // Test 4: Initial State Validation
    await runTest('Agent initial state is correct', () => {
        const agent = new ZkAffinityAgent();
        
        if (agent.wallet !== null) throw new Error('Initial wallet should be null');
        if (agent.isInitialized !== false) throw new Error('Initial isInitialized should be false');
        if (agent.profileSigned !== false) throw new Error('Initial profileSigned should be false');
        if (!Array.isArray(agent.attestations)) throw new Error('Initial attestations should be array');
        if (agent.attestations.length !== 0) throw new Error('Initial attestations should be empty');
        
        console.log('   ✓ All initial state properties correct');
    });

    // Test 5: Wallet Initialization
    await runTest('Wallet initialization works', async () => {
        const agent = new ZkAffinityAgent();
        
        // Test wallet initialization
        const walletAddress = await agent.initializeWallet();
        
        if (!walletAddress) throw new Error('Wallet address not returned');
        if (!walletAddress.startsWith('0x')) throw new Error('Wallet address invalid format');
        if (walletAddress.length !== 42) throw new Error('Wallet address invalid length');
        if (!agent.wallet) throw new Error('Wallet not stored in agent');
        if (!agent.isInitialized) throw new Error('Agent not marked as initialized');
        
        console.log(`   ✓ Wallet created: ${walletAddress}`);
    });

    // Test 6: Wallet Address Consistency
    await runTest('Wallet address consistency', async () => {
        const agent = new ZkAffinityAgent();
        
        const address1 = await agent.getWalletAddress();
        const address2 = await agent.getWalletAddress();
        
        if (address1 !== address2) throw new Error('Wallet addresses not consistent');
        
        console.log('   ✓ Wallet address remains consistent');
    });

    // Test 7: New Wallet Generation
    await runTest('New wallet generation works', async () => {
        const agent = new ZkAffinityAgent();
        
        const oldAddress = await agent.getWalletAddress();
        const newAddress = await agent.generateNewWallet();
        
        if (oldAddress === newAddress) throw new Error('New wallet has same address as old');
        if (!newAddress.startsWith('0x')) throw new Error('New wallet address invalid format');
        if (agent.profileSigned !== false) throw new Error('Profile signed status not reset');
        if (agent.attestations.length !== 0) throw new Error('Attestations not cleared');
        
        console.log(`   ✓ New wallet generated: ${oldAddress} → ${newAddress}`);
    });

    // Test 8: Ad Tag Validation
    await runTest('Ad tag validation works', async () => {
        const agent = new ZkAffinityAgent();
        
        const validTags = ['finance', 'privacy', 'travel', 'gaming'];
        
        for (const tag of validTags) {
            try {
                await agent.onAdClick(tag, 'themodernbyte.com');
                console.log(`   ✓ Valid tag "${tag}" accepted`);
            } catch (error) {
                if (error.name === 'AttestationError' && error.message.includes('Cryptography modules not available')) {
                    // This is expected in Node.js test environment
                    console.log(`   ✓ Valid tag "${tag}" accepted (crypto not available)`);
                } else {
                    throw error;
                }
            }
        }
        
        // Test invalid tag
        try {
            await agent.onAdClick('invalid', 'themodernbyte.com');
            throw new Error('Invalid tag should have been rejected');
        } catch (error) {
            if (error.name === 'AttestationError' && error.message.includes('Invalid ad tag')) {
                console.log('   ✓ Invalid tag properly rejected');
            } else {
                throw error;
            }
        }
    });

    // Test 9: Publisher Detection
    await runTest('Publisher detection works', async () => {
        const agent = new ZkAffinityAgent();
        
        // Test with explicit publisher
        try {
            await agent.onAdClick('finance', 'themodernbyte.com');
        } catch (error) {
            if (error.name === 'AttestationError' && error.message.includes('Cryptography modules not available')) {
                console.log('   ✓ Publisher parameter accepted (crypto not available)');
            } else {
                throw error;
            }
        }
        
        // Test without publisher (should fail in Node.js)
        try {
            await agent.onAdClick('finance');
            throw new Error('Should have failed without publisher in Node.js');
        } catch (error) {
            if (error.name === 'AttestationError' && error.message.includes('Publisher domain not provided')) {
                console.log('   ✓ Publisher requirement enforced in Node.js');
            } else {
                throw error;
            }
        }
    });

    // Test 10: Profile Management
    await runTest('Profile management works', async () => {
        const agent = new ZkAffinityAgent();
        
        // Test initial profile state
        if (agent.hasSignedProfile()) throw new Error('Initial profile should not be signed');
        
        // Test profile signing
        const profileResult = await agent.signProfileClaim();
        
        if (!profileResult.success) throw new Error('Profile signing should succeed');
        if (!profileResult.profileClaim) throw new Error('Profile claim should be returned');
        if (!profileResult.signature) throw new Error('Profile signature should be returned');
        if (!profileResult.walletAddress) throw new Error('Wallet address should be returned');
        
        // Test profile signed state
        if (!agent.hasSignedProfile()) throw new Error('Profile should be marked as signed');
        
        console.log('   ✓ Profile signing completed successfully');
    });

    // Test 11: Profile Summary
    await runTest('Profile summary works', async () => {
        const agent = new ZkAffinityAgent();
        
        await agent.initializeWallet();
        
        const summary = agent.getProfileSummary();
        
        if (!summary.walletAddress) throw new Error('Wallet address missing from summary');
        if (typeof summary.totalAttestations !== 'number') throw new Error('Total attestations not number');
        if (typeof summary.tagCounts !== 'object') throw new Error('Tag counts not object');
        if (!Array.isArray(summary.publishers)) throw new Error('Publishers not array');
        if (typeof summary.profileSigned !== 'boolean') throw new Error('Profile signed not boolean');
        if (typeof summary.isInitialized !== 'boolean') throw new Error('Is initialized not boolean');
        
        console.log('   ✓ Profile summary structure correct');
    });

    // Test 12: Attestation History
    await runTest('Attestation history works', async () => {
        const agent = new ZkAffinityAgent();
        
        const attestations = agent.getAttestations();
        
        if (!Array.isArray(attestations)) throw new Error('Attestations not array');
        if (attestations.length !== 0) throw new Error('Initial attestations should be empty');
        
        // Test immutability
        attestations.push({ test: 'data' });
        const attestations2 = agent.getAttestations();
        
        if (attestations2.length !== 0) throw new Error('Attestation array should be immutable');
        
        console.log('   ✓ Attestation history works correctly');
    });

    // Test 13: Signer Info
    await runTest('Signer info works', async () => {
        const agent = new ZkAffinityAgent();
        
        const info = agent.getSignerInfo();
        
        if (typeof info.hasWallet !== 'boolean') throw new Error('Has wallet not boolean');
        if (typeof info.isInitialized !== 'boolean') throw new Error('Is initialized not boolean');
        if (typeof info.attestationCount !== 'number') throw new Error('Attestation count not number');
        if (typeof info.profileSigned !== 'boolean') throw new Error('Profile signed not boolean');
        
        console.log('   ✓ Signer info structure correct');
    });

    // Test 14: Modal System (Node.js simulation)
    await runTest('Modal system works in Node.js', async () => {
        const agent = new ZkAffinityAgent();
        
        // This should not throw in Node.js environment
        await agent.showExpandedAd('finance', 'themodernbyte.com');
        
        console.log('   ✓ Modal system handles Node.js environment correctly');
    });

    // Test 15: Ad Content Generation
    await runTest('Ad content generation works', () => {
        const agent = new ZkAffinityAgent();
        
        const content = agent.getAdContent('finance', 'themodernbyte.com');
        
        if (typeof content !== 'string') throw new Error('Ad content not string');
        if (content.length === 0) throw new Error('Ad content empty');
        if (!content.includes('NeoBank+')) throw new Error('Ad content incorrect for finance/themodernbyte');
        
        // Test fallback content
        const fallbackContent = agent.getAdContent('invalid', 'invalid.com');
        if (!fallbackContent.includes('Special Offer')) throw new Error('Fallback content not working');
        
        console.log('   ✓ Ad content generation works correctly');
    });

    // Test 16: Success and Error Feedback (Node.js simulation)
    await runTest('Feedback system works in Node.js', () => {
        const agent = new ZkAffinityAgent();
        
        // Should not throw in Node.js
        agent.showSuccessFeedback('finance', { tag: 'finance', nonce: 'test' });
        agent.showErrorMessage('Test error message');
        
        console.log('   ✓ Feedback system handles Node.js environment correctly');
    });

    // Test 17: Modal Cleanup
    await runTest('Modal cleanup works', () => {
        const agent = new ZkAffinityAgent();
        
        // Should not throw even without modal
        agent.closeCurrentModal();
        
        console.log('   ✓ Modal cleanup works correctly');
    });

    // Test 18: Profile Reset
    await runTest('Profile reset works', async () => {
        const agent = new ZkAffinityAgent();
        
        const originalAddress = await agent.getWalletAddress();
        await agent.signProfileClaim();
        
        const resetResult = await agent.resetProfile();
        
        if (!resetResult.success) throw new Error('Reset should succeed');
        if (!resetResult.newWalletAddress) throw new Error('New wallet address should be returned');
        if (resetResult.newWalletAddress === originalAddress) throw new Error('New wallet should be different');
        if (agent.profileSigned !== false) throw new Error('Profile signed should be reset');
        if (agent.attestations.length !== 0) throw new Error('Attestations should be cleared');
        
        console.log(`   ✓ Profile reset: ${originalAddress} → ${resetResult.newWalletAddress}`);
    });

    // Final Results
    console.log('\n' + '='.repeat(60));
    console.log(`🎯 zkAffinityAgent Test Results: ${testsPassed}/${testsRun} passed`);
    
    if (testsPassed === testsRun) {
        console.log('✅ All tests passed! zkAffinityAgent implementation is working correctly.');
    } else {
        console.log('❌ Some tests failed. Please check the implementation.');
    }
    
    return testsPassed === testsRun;
}

// Run tests if called directly
if (require.main === module) {
    runZkAffinityAgentTests().catch(console.error);
}

module.exports = { runZkAffinityAgentTests }; 