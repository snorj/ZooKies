pragma circom 2.1.8;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/gates.circom";

// Component template for counting tag matches
template TagCounter(maxTags) {
    signal input tags[maxTags];
    signal input targetTag;
    signal output count;
    
    component eq[maxTags];
    signal partial[maxTags + 1];
    
    partial[0] <== 0;
    
    for (var i = 0; i < maxTags; i++) {
        eq[i] = IsEqual();
        eq[i].in[0] <== tags[i];
        eq[i].in[1] <== targetTag;
        partial[i + 1] <== partial[i] + eq[i].out;
    }
    
    count <== partial[maxTags];
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

// Main circuit template for threshold proof generation
template ThresholdProof(maxTags) {
    // Private inputs (witness)
    signal private input tags[maxTags];
    
    // Public inputs
    signal input targetTag;
    signal input threshold;
    
    // Public outputs
    signal output tagMatchCount;
    signal output thresholdMet;
    signal output targetTagOutput;
    
    // Constraint: tags should be in valid range (0-255 for tag IDs)
    component tagRangeCheck[maxTags];
    for (var i = 0; i < maxTags; i++) {
        tagRangeCheck[i] = LessThan(8);
        tagRangeCheck[i].in[0] <== tags[i];
        tagRangeCheck[i].in[1] <== 256; // Max tag ID
    }
    
    // Constraint: threshold should be reasonable (0-maxTags)
    component thresholdRangeCheck = LessEqThan(8);
    thresholdRangeCheck.in[0] <== threshold;
    thresholdRangeCheck.in[1] <== maxTags;
    
    // Tag counting logic
    component counter = TagCounter(maxTags);
    for (var i = 0; i < maxTags; i++) {
        counter.tags[i] <== tags[i];
    }
    counter.targetTag <== targetTag;
    
    // Threshold checking logic
    component checker = ThresholdChecker();
    checker.count <== counter.count;
    checker.threshold <== threshold;
    
    // Set outputs
    tagMatchCount <== counter.count;
    thresholdMet <== checker.isValid;
    targetTagOutput <== targetTag;
}

// Instantiate main component with 10 maximum tags for initial implementation
component main {public [targetTag, threshold]} = ThresholdProof(10); 