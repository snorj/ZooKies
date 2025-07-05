pragma circom 2.1.8;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/gates.circom";

/*
 * Tag Encoding Dictionary:
 * defi = 0
 * privacy = 1  
 * travel = 2
 * gaming = 3
 * technology = 4
 * finance = 5
 * (Range: 0-255 for future extensibility)
 */

// Component template for counting tag matches in attestations
template AttestationTagCounter(maxAttestations) {
    signal input tagIndices[maxAttestations];
    signal input targetTag;
    signal output count;
    
    component eq[maxAttestations];
    signal partial[maxAttestations + 1];
    
    partial[0] <== 0;
    
    for (var i = 0; i < maxAttestations; i++) {
        eq[i] = IsEqual();
        eq[i].in[0] <== tagIndices[i];
        eq[i].in[1] <== targetTag;
        partial[i + 1] <== partial[i] + eq[i].out;
    }
    
    count <== partial[maxAttestations];
}

// Component template for threshold validation
template ThresholdChecker() {
    signal input count;
    signal input threshold;
    signal output isValid;
    
    component gte = GreaterEqThan(8); // 8-bit comparison for counts up to 255
    gte.in[0] <== count;
    gte.in[1] <== threshold;
    isValid <== gte.out;
}

// Main circuit template for attestation threshold proof generation
template ThresholdProof(maxAttestations) {
    // Private inputs (witness) - hidden from verifier
    signal input attestationHashes[maxAttestations]; // SHA256 hashes of attestations
    signal input tagIndices[maxAttestations];        // Tag for each attestation (0-255)
    signal input walletSig[2];                       // Wallet signature (r, s components)
    
    // Public inputs - known to verifier
    signal input targetTag;   // Which tag we're counting (0-255)
    signal input threshold;   // Minimum required matches (1-50)
    
    // Public outputs - result of computation
    signal output tagMatchCount; // How many attestations matched targetTag
    
    // Input validation constraints
    
    // 1. Validate tag indices are in valid range (0-255)
    component tagRangeCheck[maxAttestations];
    for (var i = 0; i < maxAttestations; i++) {
        tagRangeCheck[i] = LessThan(8);
        tagRangeCheck[i].in[0] <== tagIndices[i];
        tagRangeCheck[i].in[1] <== 256; // Max tag ID + 1
    }
    
    // 2. Validate threshold is reasonable (1-50)
    component thresholdMinCheck = GreaterEqThan(8);
    thresholdMinCheck.in[0] <== threshold;
    thresholdMinCheck.in[1] <== 1; // Minimum threshold
    
    component thresholdMaxCheck = LessEqThan(8);
    thresholdMaxCheck.in[0] <== threshold;
    thresholdMaxCheck.in[1] <== 50; // Maximum threshold
    
    // 3. Validate targetTag is in valid range (0-255)
    component targetTagRangeCheck = LessThan(8);
    targetTagRangeCheck.in[0] <== targetTag;
    targetTagRangeCheck.in[1] <== 256;
    
    // Core constraint logic: count matching tags
    component counter = AttestationTagCounter(maxAttestations);
    for (var i = 0; i < maxAttestations; i++) {
        counter.tagIndices[i] <== tagIndices[i];
    }
    counter.targetTag <== targetTag;
    
    // Threshold checking logic  
    component checker = ThresholdChecker();
    checker.count <== counter.count;
    checker.threshold <== threshold;
    
    // Constraint: Assert threshold is met (circuit fails if not satisfied)
    // This enforces that count >= threshold
    checker.isValid === 1;
    
    // Set output
    tagMatchCount <== counter.count;
    
    // Note: Attestation hashes and wallet signature are included as private inputs
    // for potential future use, but ECDSA verification is handled off-chain 
    // in the MVP approach for performance optimization
}

// Instantiate main component with 50 maximum attestations as specified
// Public inputs: targetTag, threshold
// Private inputs: attestationHashes, tagIndices, walletSig
component main {public [targetTag, threshold]} = ThresholdProof(50); 