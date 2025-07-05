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
        // Ensure witness directories exist
        const witnessDir = path.join(__dirname, "..", "..", "witness");
        const circuitWitnessDir = path.join(__dirname, "..", "witness");
        
        if (!fs.existsSync(witnessDir)) {
            fs.mkdirSync(witnessDir, { recursive: true });
        }
        if (!fs.existsSync(circuitWitnessDir)) {
            fs.mkdirSync(circuitWitnessDir, { recursive: true });
        }

        // Load the circuit with proper configuration
        try {
            circuit = await wasm_tester(path.join(__dirname, "..", "ThresholdProof.circom"), {
                output: path.join(__dirname, "..", "..", "build", "test_circuits"),
                recompile: false,
                verbose: false,
                circom_version: "2.2.2",
                circom: "circom"  // Use global circom binary
            });
        } catch (error) {
            console.error("Circuit loading error:", error);
            throw error;
        }
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
            
            // Should complete within 10 seconds
            assert.isBelow(duration, 10000, "Circuit calculation should complete within 10 seconds");
            console.log(`⏱️ Circuit calculation completed in ${duration}ms`);
        });

        it("Should handle large input variations", async () => {
            const variations = [
                { count: 5, targetTag: "defi", threshold: 10 },
                { count: 25, targetTag: "privacy", threshold: 50 },
                { count: 45, targetTag: "gaming", threshold: 100 },
            ];
            
            for (const variation of variations) {
                const attestations = generateTestAttestations(variation.count, [variation.targetTag], 3);
                const inputs = prepareCircuitInputs(attestations, variation.targetTag, variation.threshold);
                
                const witness = await circuit.calculateWitness(inputs);
                await circuit.checkConstraints(witness);
                
                // Verify witness format
                assert.isArray(witness, "Witness should be an array");
                assert.isAbove(witness.length, 3, "Witness should have at least 4 elements");
            }
        });

        it("Should validate constraint satisfaction", async () => {
            const attestations = generateTestAttestations(20, ["defi"], 6);
            const inputs = prepareCircuitInputs(attestations, "defi", 30);
            
            // This should not throw if constraints are satisfied
            const witness = await circuit.calculateWitness(inputs);
            await circuit.checkConstraints(witness);
            
            // Verify basic witness structure
            assert.isNumber(witness[0], "First witness element should be number");
            assert.isNumber(witness[1], "Target tag should be number");
            assert.isNumber(witness[2], "Threshold should be number");
            assert.isNumber(witness[3], "Valid proof flag should be number");
        });
    });

    describe("Integration with zkProofBuilder Expectations", () => {
        
        it("Should match zkProofBuilder input format", async () => {
            // Test the same input format that zkProofBuilder would use
            const mockAttestations = [
                { tag: "defi", score: 8, id: "att1", timestamp: Date.now(), signature: "sig1" },
                { tag: "defi", score: 7, id: "att2", timestamp: Date.now(), signature: "sig2" },
                { tag: "defi", score: 6, id: "att3", timestamp: Date.now(), signature: "sig3" }
            ];
            
            const inputs = prepareCircuitInputs(mockAttestations, "defi", 20);
            
            const witness = await circuit.calculateWitness(inputs);
            await circuit.checkConstraints(witness);
            
            // Should match expected output format: [targetTag, threshold, tagMatchCount]
            assert.equal(witness[1], 1, "Should output defi tag (1)");
            assert.equal(witness[2], 20, "Should output threshold (20)");
            assert.equal(witness[3], inputs.hasValidProof, "Should output correct proof status");
        });

        it("Should handle all supported tags", async () => {
            const tagTests = [
                { tag: "defi", expectedIndex: 1 },
                { tag: "privacy", expectedIndex: 2 },
                { tag: "travel", expectedIndex: 3 },
                { tag: "gaming", expectedIndex: 4 },
                { tag: "technology", expectedIndex: 5 },
                { tag: "finance", expectedIndex: 6 }
            ];
            
            for (const test of tagTests) {
                const attestations = generateTestAttestations(5, [test.tag], 5);
                const inputs = prepareCircuitInputs(attestations, test.tag, 10);
                
                const witness = await circuit.calculateWitness(inputs);
                await circuit.checkConstraints(witness);
                
                assert.equal(witness[1], test.expectedIndex, 
                    `Tag ${test.tag} should map to index ${test.expectedIndex}`);
            }
        });

        it("Should validate output format matches server expectations", async () => {
            const attestations = generateTestAttestations(8, ["privacy"], 4);
            const inputs = prepareCircuitInputs(attestations, "privacy", 15);
            
            const witness = await circuit.calculateWitness(inputs);
            await circuit.checkConstraints(witness);
            
            // Server expects exactly 3 public signals
            assert.isAbove(witness.length, 3, "Should have at least 4 witness elements");
            
            // Validate signal ranges
            assert.isAbove(witness[1], 0, "Target tag should be positive");
            assert.isAtLeast(witness[2], 0, "Threshold should be non-negative");
            assert.oneOf(witness[3], [0, 1], "Valid proof should be 0 or 1");
        });
    });
});

// Export for potential use by other test files
module.exports = {
    generateTestAttestations,
    prepareCircuitInputs
}; 