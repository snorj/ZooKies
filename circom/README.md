# ZK Affinity Circuits

Zero-knowledge circuits for proving tag counting thresholds in the ZK Affinity Agent system.

## Overview

This directory contains the Circom implementation of the `ThresholdProof` circuit, which allows users to generate zero-knowledge proofs that they have a minimum number of attestations for a specific tag without revealing the actual tag counts or attestation details.

## Circuit Architecture

### ThresholdProof Circuit

The main circuit (`circuits/ThresholdProof.circom`) implements:

- **Tag Counting**: Counts occurrences of a target tag in an array of tags
- **Threshold Validation**: Verifies that the count meets or exceeds a specified threshold
- **Zero-Knowledge**: Proves threshold satisfaction without revealing individual tag data

#### Circuit Parameters

- **maxTags**: 10 (maximum number of tags in input array)
- **maxTagValue**: 255 (maximum tag ID value)
- **maxThreshold**: 10 (maximum threshold value)

#### Inputs/Outputs

**Private Inputs (Witness):**
- `tags[10]`: Array of tag IDs (private)

**Public Inputs:**
- `targetTag`: The tag ID to count
- `threshold`: Minimum required count

**Public Outputs:**
- `tagMatchCount`: Number of matching tags found
- `thresholdMet`: Boolean (1/0) indicating if threshold was met
- `targetTagOutput`: Echo of the target tag

## Quick Start

### Prerequisites

Install required tools globally:

```bash
# Install Circom
npm install -g circom@latest

# Install SnarkJS
npm install -g snarkjs@latest
```

### Installation

1. Navigate to the circom directory:
```bash
cd circom
```

2. Install dependencies:
```bash
npm install
```

### Build Process

1. **Compile the circuit:**
```bash
./scripts/compile.sh
```

2. **Perform trusted setup:**
```bash
./scripts/setup.sh
```

3. **Run tests:**
```bash
./scripts/test.sh
```

Or run all steps at once:
```bash
npm run build
```

## Directory Structure

```
circom/
├── circuits/                    # Circuit source files
│   ├── ThresholdProof.circom   # Main circuit
│   ├── components/             # Reusable components
│   └── tests/                  # Circuit-specific tests
├── inputs/                     # Input files
│   ├── test/                   # Test inputs
│   │   ├── valid_threshold.json
│   │   └── edge_cases.json
│   └── production/             # Production templates
│       └── template.json
├── build/                      # Generated artifacts
│   ├── circuits/               # Compiled circuits
│   ├── witness/                # Generated witnesses
│   ├── proofs/                 # Generated proofs
│   └── keys/                   # Cryptographic keys
├── scripts/                    # Build scripts
│   ├── compile.sh              # Circuit compilation
│   ├── setup.sh                # Trusted setup
│   └── test.sh                 # Test runner
├── ptau/                       # Powers of Tau files
└── package.json                # Dependencies
```

## Usage Examples

### Basic Proof Generation

```javascript
const snarkjs = require("snarkjs");

// Example input
const input = {
    tags: [1, 2, 1, 3, 1, 0, 0, 0, 0, 0],  // Private: user's tags
    targetTag: "1",                          // Public: target tag to count
    threshold: "2"                           // Public: minimum required count
};

// Generate witness
const witness = await snarkjs.wtns.calculate(
    input, 
    "build/circuits/ThresholdProof_js/ThresholdProof.wasm"
);

// Generate proof
const { proof, publicSignals } = await snarkjs.groth16.prove(
    "build/keys/ThresholdProof_final.zkey",
    witness
);

// Verify proof
const isValid = await snarkjs.groth16.verify(
    "build/keys/verification_key.json",
    publicSignals,
    proof
);
```

### Integration with ZK Affinity Agent

The circuit is designed to integrate with the existing `zkAffinityAgent.js` system:

```javascript
// In zkAffinityAgent.js
async prove({ tag = "defi", threshold = 2 }) {
    const attestations = await this.database.getAllAttestations();
    const tags = this.extractTagsFromAttestations(attestations);
    
    const input = {
        tags: this.padTagsArray(tags, 10),
        targetTag: this.tagToId(tag),
        threshold: threshold.toString()
    };
    
    return await this.generateZKProof(input);
}
```

## Testing

### Automated Tests

Run the complete test suite:
```bash
npm test
```

This includes:
- Circuit compilation verification
- Witness generation tests
- Proof generation and verification
- Edge case validation

### Manual Testing

Test individual components:

```bash
# Compile only
./scripts/compile.sh

# Setup only (requires compilation first)
./scripts/setup.sh

# Test specific input
cd build/circuits/ThresholdProof_js
node generate_witness.js ThresholdProof.wasm ../../../inputs/test/valid_threshold.json witness.wtns
```

## Security Considerations

### Trusted Setup

- Uses Powers of Tau ceremony from Hermez (2^20 constraints)
- Automated contribution for development (replace for production)
- Verification keys are exported for public verification

### Circuit Security

- All inputs are properly constrained
- Range checks prevent invalid tag IDs
- Threshold validation ensures logical consistency

### Production Deployment

For production use:
1. Participate in a proper trusted setup ceremony
2. Verify all cryptographic artifacts
3. Use deterministic builds
4. Audit circuit logic for completeness

## Performance

### Circuit Metrics

- **Constraints**: ~200-300 (depends on maxTags parameter)
- **Proof Generation**: ~1-3 seconds (browser)
- **Proof Verification**: <100ms
- **Proof Size**: ~384 bytes

### Optimization Tips

- Use appropriate maxTags value (smaller = faster)
- Pre-compile WASM for faster witness generation
- Cache proving/verification keys
- Consider proof batching for multiple verifications

## Troubleshooting

### Common Issues

**Circuit compilation fails:**
- Check Circom version (requires 2.1.8+)
- Verify circomlib installation
- Check syntax in .circom files

**Trusted setup fails:**
- Ensure sufficient disk space (~300MB for ptau file)
- Check internet connection for ptau download
- Verify snarkjs installation

**Proof generation fails:**
- Validate input format (all values as strings)
- Check constraint satisfaction
- Verify witness generation step

### Debug Mode

Enable verbose output:
```bash
export DEBUG=1
./scripts/compile.sh
```

## Integration Guide

### Browser Integration

The circuit generates WASM files compatible with browsers:

```html
<script src="https://unpkg.com/snarkjs@latest/build/snarkjs.min.js"></script>
<script>
// Load WASM and prove in browser
async function generateProof(input) {
    const wasmPath = "./build/circuits/ThresholdProof_js/ThresholdProof.wasm";
    const zkeyPath = "./build/keys/ThresholdProof_final.zkey";
    
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input, wasmPath, zkeyPath
    );
    
    return { proof, publicSignals };
}
</script>
```

### Node.js Integration

For server-side verification:

```javascript
const snarkjs = require("snarkjs");
const fs = require("fs");

async function verifyProof(proof, publicSignals) {
    const vKey = JSON.parse(fs.readFileSync("build/keys/verification_key.json"));
    return await snarkjs.groth16.verify(vKey, publicSignals, proof);
}
```

## Contributing

1. Follow Circom best practices
2. Add tests for new features
3. Update documentation
4. Verify circuit security

## License

MIT License - see main project LICENSE file. 