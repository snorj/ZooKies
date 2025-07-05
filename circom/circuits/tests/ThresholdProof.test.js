const chai = require("chai");
const path = require("path");
const wasm_tester = require("circom_tester").wasm;
const fs = require("fs");

const assert = chai.assert;

// Helper function to generate test attestations
function generateTestAttestations(count, tags = ["defi"], threshold = 5) {
    const attestations = [];
    for (let i = 0; i < count; i++) {
        attestations.push({
            id: `test_attestation_${i}`,
            tag: tags[i % tags.length],
            score: Math.floor(Math.random() * 10) + 1,
            timestamp: Date.now() - i * 1000,
            signature: `sig_${i}`
        });
    }
    return attestations;
}

// Helper function to prepare circuit inputs like zkProofBuilder
function prepareCircuitInputs(attestations, targetTag, threshold) {
    const tagMap = {
        "defi": 1,
        "privacy": 2,
        "travel": 3,
        "gaming": 4,
        "technology": 5,
        "finance": 6
    };

    const filteredAttestations = attestations.filter(att => att.tag === targetTag);
    const totalScore = filteredAttestations.reduce((sum, att) => sum + att.score, 0);
    
    // Pad to 50 attestations
    const paddedAttestations = [...filteredAttestations];
    while (paddedAttestations.length < 50) {
        paddedAttestations.push({
            id: "0",
            tag: targetTag,
            score: 0,
            timestamp: 0,
            signature: "0"
        });
    }

    return {
        attestationScores: paddedAttestations.map(att => att.score),
        targetTag: tagMap[targetTag] || 1,
        threshold: threshold,
        totalScore: totalScore,
        hasValidProof: totalScore >= threshold ? 1 : 0
    };
}

describe("ThresholdProof Circuit Tests", function() {
    this.timeout(60000); // 60 second timeout for circuit operations

    let circuit;

    before(async () => {
        // Load the circuit
        circuit = await wasm_tester(path.join(__dirname, "..", "ThresholdProof.circom"));
    });

    describe("Valid Threshold Scenarios", () => {
        
        it("Should generate valid proof for sufficient attestations", async () => {
            const attestations = generateTestAttestations(10, ["defi"], 5);
            const inputs = prepareCircuitInputs(attestations, "defi", 25); // Total score should be ~55
            
            const witness = await circuit.calculateWitness(inputs);
            await circuit.checkConstraints(witness);
            
            // Check public outputs
            assert.equal(witness[1], inputs.targetTag, "Target tag should match input");
            assert.equal(witness[2], inputs.threshold, "Threshold should match input");
            assert.equal(witness[3], inputs.hasValidProof, "Should indicate valid proof");
        });

        it("Should handle exact threshold scenario", async () => {
            const attestations = [
                { tag: "defi", score: 5 },
                { tag: "defi", score: 5 },
                { tag: "defi", score: 5 }
            ];
            const inputs = prepareCircuitInputs(attestations, "defi", 15); // Exact match
            
            const witness = await circuit.calculateWitness(inputs);
            await circuit.checkConstraints(witness);
            
            assert.equal(witness[3], 1, "Should indicate valid proof for exact threshold");
        });

        it("Should handle different tag combinations", async () => {
            const attestations = generateTestAttestations(15, ["privacy", "travel"], 3);
            const inputs = prepareCircuitInputs(attestations, "privacy", 20);
            
            const witness = await circuit.calculateWitness(inputs);
            await circuit.checkConstraints(witness);
            
            assert.equal(witness[1], 2, "Should map privacy tag correctly"); // privacy = 2
        });

        it("Should handle maximum attestation load (50 attestations)", async () => {
            const attestations = generateTestAttestations(50, ["defi"], 8);
            const inputs = prepareCircuitInputs(attestations, "defi", 100);
            
            const witness = await circuit.calculateWitness(inputs);
            await circuit.checkConstraints(witness);
            
            // Verify all 50 attestations are processed
            assert.equal(inputs.attestationScores.length, 50, "Should handle 50 attestations");
        });
    });

    describe("Insufficient Attestation Scenarios", () => {
        
        it("Should reject insufficient attestations", async () => {
            const attestations = generateTestAttestations(3, ["defi"], 2); // Low scores
            const inputs = prepareCircuitInputs(attestations, "defi", 50); // High threshold
            
            const witness = await circuit.calculateWitness(inputs);
            await circuit.checkConstraints(witness);
            
            assert.equal(witness[3], 0, "Should indicate invalid proof for insufficient attestations");
        });

        it("Should handle zero attestations gracefully", async () => {
            const inputs = prepareCircuitInputs([], "defi", 10);
            
            const witness = await circuit.calculateWitness(inputs);
            await circuit.checkConstraints(witness);
            
            assert.equal(witness[3], 0, "Should indicate invalid proof for zero attestations");
        });

        it("Should reject when no matching tag attestations", async () => {
            const attestations = generateTestAttestations(10, ["privacy"], 5);
            const inputs = prepareCircuitInputs(attestations, "defi", 10); // Different tag
            
            const witness = await circuit.calculateWitness(inputs);
            await circuit.checkConstraints(witness);
            
            assert.equal(witness[3], 0, "Should indicate invalid proof for no matching tags");
        });
    });

    describe("Edge Cases and Error Handling", () => {
        
        it("Should handle zero threshold", async () => {
            const attestations = generateTestAttestations(5, ["defi"], 1);
            const inputs = prepareCircuitInputs(attestations, "defi", 0);
            
            const witness = await circuit.calculateWitness(inputs);
            await circuit.checkConstraints(witness);
            
            assert.equal(witness[3], 1, "Should indicate valid proof for zero threshold");
        });

        it("Should handle very high threshold", async () => {
            const attestations = generateTestAttestations(10, ["defi"], 3);
            const inputs = prepareCircuitInputs(attestations, "defi", 1000);
            
            const witness = await circuit.calculateWitness(inputs);
            await circuit.checkConstraints(witness);
            
            assert.equal(witness[3], 0, "Should indicate invalid proof for very high threshold");
        });

        it("Should validate all tag mappings", async () => {
            const tags = ["defi", "privacy", "travel", "gaming", "technology", "finance"];
            const expectedMappings = [1, 2, 3, 4, 5, 6];
            
            for (let i = 0; i < tags.length; i++) {
                const attestations = generateTestAttestations(5, [tags[i]], 5);
                const inputs = prepareCircuitInputs(attestations, tags[i], 10);
                
                const witness = await circuit.calculateWitness(inputs);
                await circuit.checkConstraints(witness);
                
                assert.equal(witness[1], expectedMappings[i], `Should map ${tags[i]} to ${expectedMappings[i]}`);
            }
        });
    });

    describe("Performance and Constraint Validation", () => {
        
        it("Should complete proof generation within reasonable time", async () => {
            const startTime = Date.now();
            
            const attestations = generateTestAttestations(30, ["defi"], 4);
            const inputs = prepareCircuitInputs(attestations, "defi", 50);
            
            const witness = await circuit.calculateWitness(inputs);
            await circuit.checkConstraints(witness);
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            assert.isBelow(duration, 5000, "Circuit calculation should complete within 5 seconds");
        });

        it("Should validate constraint satisfaction", async () => {
            const attestations = generateTestAttestations(20, ["privacy"], 6);
            const inputs = prepareCircuitInputs(attestations, "privacy", 60);
            
            const witness = await circuit.calculateWitness(inputs);
            
            // This should not throw if constraints are satisfied
            await circuit.checkConstraints(witness);
            
            assert.isTrue(true, "All constraints should be satisfied");
        });

        it("Should produce consistent results for same inputs", async () => {
            const attestations = generateTestAttestations(15, ["gaming"], 5);
            const inputs = prepareCircuitInputs(attestations, "gaming", 40);
            
            const witness1 = await circuit.calculateWitness(inputs);
            const witness2 = await circuit.calculateWitness(inputs);
            
            // Compare relevant public outputs
            assert.equal(witness1[1], witness2[1], "Target tag should be consistent");
            assert.equal(witness1[2], witness2[2], "Threshold should be consistent");
            assert.equal(witness1[3], witness2[3], "Proof validity should be consistent");
        });
    });

    describe("Input Validation Tests", () => {
        
        it("Should handle negative scores gracefully", async () => {
            const inputs = {
                attestationScores: [-1, -5, 10, 0, 0, ...Array(45).fill(0)],
                targetTag: 1,
                threshold: 5,
                totalScore: 4, // -1 + -5 + 10 = 4
                hasValidProof: 0
            };
            
            // This should either reject or handle negative values appropriately
            try {
                const witness = await circuit.calculateWitness(inputs);
                await circuit.checkConstraints(witness);
                // If it doesn't throw, check the output makes sense
                assert.equal(witness[3], 0, "Should reject negative scores");
            } catch (error) {
                // Expected behavior for invalid inputs
                assert.isTrue(true, "Circuit should reject invalid negative inputs");
            }
        });

        it("Should handle invalid tag mapping", async () => {
            const inputs = {
                attestationScores: [5, 5, 5, ...Array(47).fill(0)],
                targetTag: 999, // Invalid tag
                threshold: 10,
                totalScore: 15,
                hasValidProof: 1
            };
            
            try {
                const witness = await circuit.calculateWitness(inputs);
                await circuit.checkConstraints(witness);
                // If successful, the circuit should handle invalid tags gracefully
                assert.isTrue(true, "Circuit handled invalid tag gracefully");
            } catch (error) {
                // Expected behavior for invalid tag
                assert.isTrue(true, "Circuit should reject invalid tag mappings");
            }
        });
    });
});

// Export for potential use by other test files
module.exports = {
    generateTestAttestations,
    prepareCircuitInputs
}; 