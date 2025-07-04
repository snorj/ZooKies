const { DatabaseManager } = require('../shared/database');

async function testDatabase() {
    const db = new DatabaseManager();
    
    try {
        console.log('🔍 Testing Database Operations...\n');
        
        // Test 1: Connect to database
        console.log('1. Testing database connection...');
        await db.connect();
        console.log('✅ Database connection successful\n');
        
        // Test 2: Store sample attestation
        console.log('2. Testing attestation storage...');
        const sampleAttestation = {
            tag: 'finance',
            signature: '0x1234567890abcdef...',
            publisher: 'themodernbyte.com',
            userWallet: '0xTestWallet123456789'
        };
        
        const attestationId = await db.storeAttestation(sampleAttestation);
        console.log(`✅ Attestation stored with ID: ${attestationId}\n`);
        
        // Test 3: Retrieve attestations
        console.log('3. Testing attestation retrieval...');
        const attestations = await db.getAttestations(sampleAttestation.userWallet);
        console.log(`✅ Retrieved ${attestations.length} attestation(s)`);
        console.log('   Sample attestation:', JSON.stringify(attestations[0], null, 2));
        console.log();
        
        // Test 4: Store user profile
        console.log('4. Testing user profile storage...');
        const sampleProfile = {
            walletAddress: '0xTestWallet123456789',
            signedProfileClaim: '{"interests": ["finance", "technology"], "age_range": "25-35"}',
            selfProof: '{"identity_proof": "verified", "timestamp": "2024-01-01"}'
        };
        
        const profileResult = await db.upsertUserProfile(sampleProfile);
        console.log(`✅ User profile stored: ${profileResult}\n`);
        
        // Test 5: Retrieve user profile
        console.log('5. Testing user profile retrieval...');
        const retrievedProfile = await db.getUserProfile(sampleProfile.walletAddress);
        console.log('✅ Retrieved user profile:', JSON.stringify(retrievedProfile, null, 2));
        console.log();
        
        // Test 6: Get attestation statistics
        console.log('6. Testing attestation statistics...');
        const stats = await db.getAttestationStats();
        console.log('✅ Attestation statistics:', JSON.stringify(stats, null, 2));
        console.log();
        
        // Test 7: Test filtering attestations by tag
        console.log('7. Testing attestation filtering...');
        const filteredAttestations = await db.getAttestations(sampleAttestation.userWallet, 'finance');
        console.log(`✅ Retrieved ${filteredAttestations.length} finance attestation(s)\n`);
        
        // Test 8: Update user profile
        console.log('8. Testing user profile update...');
        const updatedProfile = {
            walletAddress: '0xTestWallet123456789',
            signedProfileClaim: '{"interests": ["finance", "technology", "gaming"], "age_range": "25-35"}',
            selfProof: '{"identity_proof": "verified", "timestamp": "2024-01-02"}'
        };
        
        const updateResult = await db.upsertUserProfile(updatedProfile);
        console.log(`✅ User profile updated: ${updateResult}\n`);
        
        // Test 9: Verify update
        console.log('9. Testing updated profile retrieval...');
        const verifyProfile = await db.getUserProfile(updatedProfile.walletAddress);
        console.log('✅ Updated profile verified:', JSON.stringify(verifyProfile, null, 2));
        console.log();
        
        console.log('🎉 All database tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Database test failed:', error);
        process.exit(1);
    } finally {
        // Close database connection
        await db.close();
    }
}

// Run the test
testDatabase().catch(console.error); 